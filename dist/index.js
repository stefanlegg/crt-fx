// src/effects/bloom.ts
var bloom = {
  name: "bloom",
  defaultParams: {
    radius: 4,
    strength: 0.3,
    threshold: 0.7
  },
  fragmentShader: `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_radius;
uniform float u_strength;
uniform float u_threshold;
uniform vec2 u_resolution;

void main() {
  vec4 original = texture2D(u_texture, v_texCoord);
  vec2 texelSize = 1.0 / u_resolution;

  // Two-pass gaussian approximation combined in single pass
  // Sample in a cross/star pattern for efficiency
  vec3 bloomColor = vec3(0.0);
  float totalWeight = 0.0;

  // Sample radius in texels
  float r = u_radius;

  for (int i = -12; i <= 12; i++) {
    for (int j = -12; j <= 12; j++) {
      float fi = float(i);
      float fj = float(j);
      if (abs(fi) > r || abs(fj) > r) continue;

      // Skip corners for diamond/circular pattern (faster)
      if (fi * fi + fj * fj > r * r) continue;

      vec2 offset = vec2(fi, fj) * texelSize;
      vec4 samp = texture2D(u_texture, v_texCoord + offset);

      float brightness = dot(samp.rgb, vec3(0.2126, 0.7152, 0.0722));
      if (brightness < u_threshold) continue;

      float weight = exp(-0.5 * (fi * fi + fj * fj) / (r * r * 0.25 + 0.001));
      bloomColor += samp.rgb * weight * (brightness - u_threshold);
      totalWeight += weight;
    }
  }

  if (totalWeight > 0.0) {
    bloomColor /= totalWeight;
  }

  // Composite bloom onto original
  vec3 result = original.rgb + bloomColor * u_strength;
  gl_FragColor = vec4(result, original.a);
}
`,
  setUniforms(gl, program, params, _time, resolution) {
    gl.uniform1f(gl.getUniformLocation(program, "u_radius"), params.radius ?? 4);
    gl.uniform1f(gl.getUniformLocation(program, "u_strength"), params.strength ?? 0.3);
    gl.uniform1f(gl.getUniformLocation(program, "u_threshold"), params.threshold ?? 0.7);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
  }
};

// src/effects/chromatic.ts
var chromatic = {
  name: "chromatic",
  defaultParams: {
    offset: 2,
    angle: 0
  },
  fragmentShader: `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_offset;
uniform float u_angle;
uniform vec2 u_resolution;

void main() {
  // Direction from center to current pixel
  vec2 center = vec2(0.5);
  vec2 dir = v_texCoord - center;

  // Offset in pixels, converted to UV space
  vec2 offsetDir;
  if (u_angle == 0.0) {
    offsetDir = normalize(dir + vec2(0.0001));
  } else {
    float a = u_angle * 3.14159265 / 180.0;
    offsetDir = vec2(cos(a), sin(a));
  }

  vec2 texelSize = 1.0 / u_resolution;
  vec2 off = offsetDir * u_offset * texelSize;

  // Sample R, G, B at different offsets
  float r = texture2D(u_texture, v_texCoord + off).r;
  float g = texture2D(u_texture, v_texCoord).g;
  float b = texture2D(u_texture, v_texCoord - off).b;
  float a = texture2D(u_texture, v_texCoord).a;

  gl_FragColor = vec4(r, g, b, a);
}
`,
  setUniforms(gl, program, params, _time, resolution) {
    gl.uniform1f(gl.getUniformLocation(program, "u_offset"), params.offset ?? 2);
    gl.uniform1f(gl.getUniformLocation(program, "u_angle"), params.angle ?? 0);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
  }
};

// src/effects/color-bleed.ts
var colorBleed = {
  name: "colorBleed",
  defaultParams: {
    amount: 0.003,
    direction: 0
  },
  fragmentShader: `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_amount;
uniform float u_direction;
uniform vec2 u_resolution;

void main() {
  vec4 center = texture2D(u_texture, v_texCoord);
  vec2 texelSize = 1.0 / u_resolution;

  // Horizontal color bleeding - sample neighbors and smear color
  float bleedPixels = u_amount * u_resolution.x;

  // Direction: 0 = horizontal (left-to-right), 1 = vertical
  vec2 dir;
  if (u_direction < 0.5) {
    dir = vec2(1.0, 0.0);
  } else {
    dir = vec2(0.0, 1.0);
  }

  // Accumulate weighted color from neighbors (asymmetric - more from left/above)
  vec3 bleed = center.rgb;
  float totalWeight = 1.0;

  // Sample previous pixels (trailing bleed)
  for (int i = 1; i <= 8; i++) {
    float fi = float(i);
    if (fi > bleedPixels * 10.0) break;

    float weight = exp(-fi * 0.5 / (bleedPixels * 3.0 + 0.001));
    vec2 offset = -dir * fi * texelSize;
    vec3 samp = texture2D(u_texture, v_texCoord + offset).rgb;

    bleed += samp * weight;
    totalWeight += weight;
  }

  bleed /= totalWeight;

  // Mix bleeding with original
  float mixAmt = clamp(u_amount * 10.0, 0.0, 1.0);
  vec3 result = mix(center.rgb, bleed, mixAmt);

  gl_FragColor = vec4(result, center.a);
}
`,
  setUniforms(gl, program, params, _time, resolution) {
    gl.uniform1f(gl.getUniformLocation(program, "u_amount"), params.amount ?? 0.003);
    gl.uniform1f(gl.getUniformLocation(program, "u_direction"), params.direction ?? 0);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
  }
};

// src/effects/curvature.ts
var curvature = {
  name: "curvature",
  defaultParams: {
    amount: 0.02
  },
  fragmentShader: `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_amount;

vec2 barrelDistortion(vec2 uv, float k) {
  // Convert to centered coordinates (-1 to 1)
  vec2 centered = uv * 2.0 - 1.0;

  // Apply barrel distortion
  float r2 = dot(centered, centered);
  vec2 distorted = centered * (1.0 + k * r2 + k * k * r2 * r2);

  // Convert back to 0-1 range
  return distorted * 0.5 + 0.5;
}

void main() {
  vec2 uv = barrelDistortion(v_texCoord, u_amount);

  // Black outside the curved screen area
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  gl_FragColor = texture2D(u_texture, uv);
}
`,
  setUniforms(gl, program, params) {
    gl.uniform1f(gl.getUniformLocation(program, "u_amount"), params.amount ?? 0.02);
  }
};

// src/effects/noise.ts
var noise = {
  name: "noise",
  defaultParams: {
    intensity: 0.05,
    flickerIntensity: 0.03,
    speed: 1
  },
  fragmentShader: `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_intensity;
uniform float u_flickerIntensity;
uniform float u_speed;
uniform float u_time;
uniform vec2 u_resolution;

// Pseudo-random hash
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Smooth noise
float noise2d(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);

  // Animated noise grain
  float time = u_time * u_speed;
  vec2 noiseCoord = v_texCoord * u_resolution;
  float n = hash(noiseCoord + vec2(time * 127.1, time * 311.7));

  // Apply noise
  vec3 grain = vec3(n * 2.0 - 1.0) * u_intensity;
  color.rgb += grain;

  // Flicker: global brightness variation
  float flicker = 1.0 + (hash(vec2(floor(time * 15.0), 0.0)) * 2.0 - 1.0) * u_flickerIntensity;
  color.rgb *= flicker;

  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
}
`,
  setUniforms(gl, program, params, time, resolution) {
    gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), params.intensity ?? 0.05);
    gl.uniform1f(gl.getUniformLocation(program, "u_flickerIntensity"), params.flickerIntensity ?? 0.03);
    gl.uniform1f(gl.getUniformLocation(program, "u_speed"), params.speed ?? 1);
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
  }
};

// src/effects/phosphor.ts
var phosphor = {
  name: "phosphor",
  defaultParams: {
    style: "shadow-mask",
    scale: 1,
    intensity: 0.5
  },
  fragmentShader: `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform int u_style;
uniform float u_scale;
uniform float u_intensity;
uniform vec2 u_resolution;

// Phosphor style constants
const int SHADOW_MASK    = 0;
const int APERTURE_GRILLE = 1;
const int SLOT_MASK      = 2;
const int CROMACLEAR     = 3;
const int PVM            = 4;
const int ARCADE         = 5;
const int VGA            = 6;
const int COMPOSITE      = 7;
const int MONO_GREEN     = 8;
const int MONO_AMBER     = 9;

float luminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 shadowMask(vec2 fragCoord, float scale) {
  float cellW = 3.0 * scale;
  float cellH = 3.0 * scale;
  vec2 pos = fragCoord;
  // Offset every other row
  float row = floor(pos.y / cellH);
  if (mod(row, 2.0) > 0.5) {
    pos.x += cellW * 0.5;
  }
  float col = mod(pos.x, cellW);
  float phase = col / cellW;
  vec3 mask = vec3(0.2);
  if (phase < 0.333) {
    mask.r = 1.0;
    mask.g = 0.3;
    mask.b = 0.3;
  } else if (phase < 0.666) {
    mask.r = 0.3;
    mask.g = 1.0;
    mask.b = 0.3;
  } else {
    mask.r = 0.3;
    mask.g = 0.3;
    mask.b = 1.0;
  }
  // Circular dot shape
  vec2 cellPos = vec2(mod(pos.x, cellW) / cellW, mod(pos.y, cellH) / cellH);
  float dist = length(cellPos - 0.5) * 2.0;
  float dot = smoothstep(1.0, 0.3, dist);
  return mix(vec3(0.1), mask, dot);
}

vec3 apertureGrille(vec2 fragCoord, float scale) {
  float cellW = 3.0 * scale;
  float col = mod(fragCoord.x, cellW);
  float phase = col / cellW;
  vec3 mask = vec3(0.0);
  if (phase < 0.333) {
    mask = vec3(1.0, 0.15, 0.15);
  } else if (phase < 0.666) {
    mask = vec3(0.15, 1.0, 0.15);
  } else {
    mask = vec3(0.15, 0.15, 1.0);
  }
  return mask;
}

vec3 slotMask(vec2 fragCoord, float scale) {
  float cellW = 3.0 * scale;
  float cellH = 4.0 * scale;
  vec2 pos = fragCoord;
  float row = floor(pos.y / cellH);
  if (mod(row, 2.0) > 0.5) {
    pos.x += cellW * 0.5;
  }
  float col = mod(pos.x, cellW);
  float phase = col / cellW;
  // Slot shape — rectangular with gap
  float slotY = mod(pos.y, cellH) / cellH;
  float slotMask = step(0.15, slotY) * step(slotY, 0.85);
  vec3 mask = vec3(0.1);
  if (phase < 0.333) {
    mask = vec3(1.0, 0.1, 0.1);
  } else if (phase < 0.666) {
    mask = vec3(0.1, 1.0, 0.1);
  } else {
    mask = vec3(0.1, 0.1, 1.0);
  }
  return mix(vec3(0.1), mask, slotMask);
}

vec3 cromaclear(vec2 fragCoord, float scale) {
  float cellW = 3.0 * scale;
  float cellH = 2.0 * scale;
  float col = mod(fragCoord.x, cellW);
  float phase = col / cellW;
  // Elliptical shape
  vec2 cellPos = vec2(mod(fragCoord.x, cellW) / cellW, mod(fragCoord.y, cellH) / cellH);
  float ex = (cellPos.x - 0.5) * 2.0;
  float ey = (cellPos.y - 0.5) * 1.5;
  float ellipse = smoothstep(1.0, 0.4, length(vec2(ex, ey)));
  vec3 mask = vec3(0.1);
  if (phase < 0.333) {
    mask = vec3(1.0, 0.1, 0.1);
  } else if (phase < 0.666) {
    mask = vec3(0.1, 1.0, 0.1);
  } else {
    mask = vec3(0.1, 0.1, 1.0);
  }
  return mix(vec3(0.1), mask, ellipse);
}

vec3 pvmMask(vec2 fragCoord, float scale) {
  // Ultra-fine aperture grille
  float cellW = 2.0 * scale;
  float col = mod(fragCoord.x, cellW);
  float phase = col / cellW;
  vec3 mask = vec3(0.0);
  if (phase < 0.333) {
    mask = vec3(1.0, 0.2, 0.2);
  } else if (phase < 0.666) {
    mask = vec3(0.2, 1.0, 0.2);
  } else {
    mask = vec3(0.2, 0.2, 1.0);
  }
  return mask;
}

vec3 arcadeMask(vec2 fragCoord, float scale) {
  // Large coarse dot triads
  float cellW = 6.0 * scale;
  float cellH = 6.0 * scale;
  vec2 pos = fragCoord;
  float row = floor(pos.y / cellH);
  if (mod(row, 2.0) > 0.5) {
    pos.x += cellW * 0.5;
  }
  float col = mod(pos.x, cellW);
  float phase = col / cellW;
  vec2 cellPos = vec2(mod(pos.x, cellW) / cellW, mod(pos.y, cellH) / cellH);
  float dist = length(cellPos - 0.5) * 2.0;
  float dot = smoothstep(1.0, 0.2, dist);
  vec3 mask = vec3(0.0);
  if (phase < 0.333) {
    mask = vec3(1.0, 0.0, 0.0);
  } else if (phase < 0.666) {
    mask = vec3(0.0, 1.0, 0.0);
  } else {
    mask = vec3(0.0, 0.0, 1.0);
  }
  return mix(vec3(0.02), mask, dot);
}

vec3 vgaMask(vec2 fragCoord, float scale) {
  // Medium-pitch shadow mask with sharp edges
  float cellW = 4.0 * scale;
  float cellH = 4.0 * scale;
  vec2 pos = fragCoord;
  float row = floor(pos.y / cellH);
  if (mod(row, 2.0) > 0.5) {
    pos.x += cellW * 0.5;
  }
  float col = mod(pos.x, cellW);
  float phase = col / cellW;
  // Sharp rectangular subpixels
  vec2 cellPos = vec2(mod(pos.x, cellW) / cellW, mod(pos.y, cellH) / cellH);
  float inCell = step(0.1, cellPos.x) * step(cellPos.x, 0.9) * step(0.1, cellPos.y) * step(cellPos.y, 0.9);
  vec3 mask = vec3(0.05);
  if (phase < 0.333) {
    mask = vec3(1.0, 0.1, 0.1);
  } else if (phase < 0.666) {
    mask = vec3(0.1, 1.0, 0.1);
  } else {
    mask = vec3(0.1, 0.1, 1.0);
  }
  return mix(vec3(0.05), mask, inCell);
}

vec3 compositeMask(vec2 fragCoord, float scale) {
  // Soft/blurred shadow mask
  float cellW = 3.0 * scale;
  float cellH = 3.0 * scale;
  vec2 pos = fragCoord;
  float row = floor(pos.y / cellH);
  if (mod(row, 2.0) > 0.5) {
    pos.x += cellW * 0.5;
  }
  float col = mod(pos.x, cellW);
  float phase = col / cellW;
  vec2 cellPos = vec2(mod(pos.x, cellW) / cellW, mod(pos.y, cellH) / cellH);
  float dist = length(cellPos - 0.5) * 2.0;
  // Very soft/blurred dot
  float dot = smoothstep(1.5, 0.0, dist);
  vec3 mask = vec3(0.2);
  if (phase < 0.333) {
    mask = vec3(1.0, 0.3, 0.3);
  } else if (phase < 0.666) {
    mask = vec3(0.3, 1.0, 0.3);
  } else {
    mask = vec3(0.3, 0.3, 1.0);
  }
  return mix(vec3(0.2), mask, dot);
}

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);
  vec2 fragCoord = v_texCoord * u_resolution;

  vec3 mask = vec3(1.0);

  if (u_style == SHADOW_MASK) {
    mask = shadowMask(fragCoord, u_scale);
  } else if (u_style == APERTURE_GRILLE) {
    mask = apertureGrille(fragCoord, u_scale);
  } else if (u_style == SLOT_MASK) {
    mask = slotMask(fragCoord, u_scale);
  } else if (u_style == CROMACLEAR) {
    mask = cromaclear(fragCoord, u_scale);
  } else if (u_style == PVM) {
    mask = pvmMask(fragCoord, u_scale);
  } else if (u_style == ARCADE) {
    mask = arcadeMask(fragCoord, u_scale);
  } else if (u_style == VGA) {
    mask = vgaMask(fragCoord, u_scale);
  } else if (u_style == COMPOSITE) {
    mask = compositeMask(fragCoord, u_scale);
  } else if (u_style == MONO_GREEN) {
    // Single green phosphor
    float lum = luminance(color.rgb);
    color.rgb = vec3(lum * 0.2, lum, lum * 0.2) * vec3(0.2, 1.0, 0.133);
    mask = vec3(1.0);
  } else if (u_style == MONO_AMBER) {
    // Single amber phosphor
    float lum = luminance(color.rgb);
    color.rgb = vec3(lum, lum * 0.69, lum * 0.0) * vec3(1.0, 0.69, 0.0);
    mask = vec3(1.0);
  }

  // Blend phosphor mask with intensity
  vec3 result = color.rgb * mix(vec3(1.0), mask, u_intensity);

  gl_FragColor = vec4(result, color.a);
}
`,
  setUniforms(gl, program, params, _time, resolution) {
    const styleMap = {
      "shadow-mask": 0,
      "aperture-grille": 1,
      "slot-mask": 2,
      cromaclear: 3,
      pvm: 4,
      arcade: 5,
      vga: 6,
      composite: 7,
      "mono-green": 8,
      "mono-amber": 9
    };
    const styleIdx = styleMap[params.style] ?? 0;
    gl.uniform1i(gl.getUniformLocation(program, "u_style"), styleIdx);
    gl.uniform1f(gl.getUniformLocation(program, "u_scale"), params.scale ?? 1);
    gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), params.intensity ?? 0.5);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
  }
};

// src/effects/scanlines.ts
var scanlines = {
  name: "scanlines",
  defaultParams: {
    intensity: 0.5,
    count: 800,
    sharpness: 0.5,
    phase: 0
  },
  fragmentShader: `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_intensity;
uniform float u_count;
uniform float u_sharpness;
uniform float u_phase;
uniform vec2 u_resolution;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);

  // Scanline pattern: sine wave along Y axis
  float y = v_texCoord.y * u_count + u_phase;
  float scanline = sin(y * 3.14159265) * 0.5 + 0.5;

  // Sharpen the sine wave using pow — higher sharpness = harder edges
  scanline = pow(scanline, mix(0.5, 4.0, u_sharpness));

  // Mix between full color and darkened scanline
  float mask = 1.0 - u_intensity * (1.0 - scanline);

  gl_FragColor = vec4(color.rgb * mask, color.a);
}
`,
  setUniforms(gl, program, params, time, resolution) {
    gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), params.intensity ?? 0.5);
    gl.uniform1f(gl.getUniformLocation(program, "u_count"), params.count ?? 800);
    gl.uniform1f(gl.getUniformLocation(program, "u_sharpness"), params.sharpness ?? 0.5);
    gl.uniform1f(gl.getUniformLocation(program, "u_phase"), (params.phase ?? 0) + time * 0.5);
    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
  }
};

// src/effects/vignette.ts
var vignette = {
  name: "vignette",
  defaultParams: {
    strength: 0.3,
    radius: 0.8
  },
  fragmentShader: `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_strength;
uniform float u_radius;

void main() {
  vec4 color = texture2D(u_texture, v_texCoord);

  // Distance from center (0,0 at center, ~1.0 at corners)
  vec2 uv = v_texCoord * 2.0 - 1.0;
  float dist = length(uv);

  // Smooth vignette falloff
  float vig = smoothstep(u_radius, u_radius + (1.0 - u_radius) * 1.2, dist);
  float factor = 1.0 - vig * u_strength;

  gl_FragColor = vec4(color.rgb * factor, color.a);
}
`,
  setUniforms(gl, program, params) {
    gl.uniform1f(gl.getUniformLocation(program, "u_strength"), params.strength ?? 0.3);
    gl.uniform1f(gl.getUniformLocation(program, "u_radius"), params.radius ?? 0.8);
  }
};

// src/effects/index.ts
var allEffects = [
  curvature,
  colorBleed,
  chromatic,
  phosphor,
  scanlines,
  noise,
  bloom,
  vignette
];

// src/core/shaders.ts
var VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
var PASSTHROUGH_FRAGMENT = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader)
    throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}
Source:
${source}`);
  }
  return shader;
}
function createProgram(gl, vertexSource, fragmentSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program)
    throw new Error("Failed to create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

// src/core/pipeline.ts
class Pipeline {
  gl;
  fbos = [];
  passes = [];
  quadBuffer = null;
  width = 0;
  height = 0;
  constructor(gl) {
    this.gl = gl;
    this.setupQuad();
  }
  setupQuad() {
    const gl = this.gl;
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  }
  createFBO(width, height) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { framebuffer, texture };
  }
  resize(width, height) {
    if (this.width === width && this.height === height)
      return;
    this.width = width;
    this.height = height;
    this.destroyFBOs();
    for (let i = 0;i < 4; i++) {
      this.fbos.push(this.createFBO(width, height));
    }
  }
  destroyFBOs() {
    const gl = this.gl;
    for (const fbo of this.fbos) {
      gl.deleteFramebuffer(fbo.framebuffer);
      gl.deleteTexture(fbo.texture);
    }
    this.fbos = [];
  }
  buildPasses(effects) {
    const gl = this.gl;
    for (const p of this.passes) {
      gl.deleteProgram(p.program);
    }
    this.passes = [];
    for (const effect of effects) {
      if (isMultiPass(effect)) {
        for (let i = 0;i < effect.passes; i++) {
          const frag = effect.getFragmentShader(i);
          const program = createProgram(gl, VERTEX_SHADER, frag);
          this.passes.push({ program, effect, passIndex: i });
        }
      } else {
        const program = createProgram(gl, VERTEX_SHADER, effect.fragmentShader);
        this.passes.push({ program, effect, passIndex: 0 });
      }
    }
  }
  render(sourceTexture, params, time) {
    const gl = this.gl;
    if (this.passes.length === 0 || this.fbos.length < 2)
      return;
    const resolution = [this.width, this.height];
    let inputTexture = sourceTexture;
    let pingPong = 0;
    for (let i = 0;i < this.passes.length; i++) {
      const pass = this.passes[i];
      const isLast = i === this.passes.length - 1;
      const effectParams = params[pass.effect.name] || pass.effect.defaultParams;
      if (isLast) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      } else {
        const target = this.fbos[pingPong];
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, this.width, this.height);
      }
      gl.useProgram(pass.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);
      const texLoc = gl.getUniformLocation(pass.program, "u_texture");
      gl.uniform1i(texLoc, 0);
      if (isMultiPass(pass.effect)) {
        pass.effect.setPassUniforms(gl, pass.program, effectParams, time, resolution, pass.passIndex);
      } else {
        pass.effect.setUniforms(gl, pass.program, effectParams, time, resolution);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      const posLoc = gl.getAttribLocation(pass.program, "a_position");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!isLast) {
        inputTexture = this.fbos[pingPong].texture;
        pingPong = (pingPong + 1) % this.fbos.length;
      }
    }
  }
  renderPassthrough(sourceTexture, passthroughProgram) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(passthroughProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(gl.getUniformLocation(passthroughProgram, "u_texture"), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const posLoc = gl.getAttribLocation(passthroughProgram, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  dispose() {
    const gl = this.gl;
    this.destroyFBOs();
    for (const p of this.passes) {
      gl.deleteProgram(p.program);
    }
    this.passes = [];
    if (this.quadBuffer) {
      gl.deleteBuffer(this.quadBuffer);
      this.quadBuffer = null;
    }
  }
}
function isMultiPass(effect) {
  return "passes" in effect && typeof effect.passes === "number";
}

// src/core/renderer.ts
class Renderer {
  canvas;
  gl;
  pipeline;
  sourceTexture = null;
  passthroughProgram;
  animFrameId = null;
  startTime = 0;
  params = {};
  activeEffects = [];
  imageWidth = 0;
  imageHeight = 0;
  contextLost = false;
  onContextLost;
  onContextRestored;
  resizeObserver = null;
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false
    });
    if (!gl)
      throw new Error("WebGL not supported");
    this.gl = gl;
    this.pipeline = new Pipeline(gl);
    this.passthroughProgram = createProgram(gl, VERTEX_SHADER, PASSTHROUGH_FRAGMENT);
    this.setOptions(options);
    this.onContextLost = (e) => {
      e.preventDefault();
      this.contextLost = true;
      if (this.animFrameId !== null) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
    };
    this.onContextRestored = () => {
      this.contextLost = false;
      this.rebuildAll();
    };
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas);
  }
  handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      if (this.imageWidth > 0) {
        this.pipeline.resize(this.imageWidth, this.imageHeight);
      }
    }
  }
  setOptions(options) {
    const effectMap = {};
    for (const e of allEffects) {
      effectMap[e.name] = e;
    }
    this.params = {};
    this.activeEffects = [];
    const effectOrder = [
      "curvature",
      "colorBleed",
      "chromatic",
      "phosphor",
      "scanlines",
      "noise",
      "bloom",
      "vignette"
    ];
    for (const name of effectOrder) {
      const opts = options[name];
      if (opts === undefined)
        continue;
      if (opts.enabled === false)
        continue;
      const effect = effectMap[name];
      if (!effect)
        continue;
      this.params[name] = { ...effect.defaultParams, ...opts };
      this.activeEffects.push(effect);
    }
    if (!this.contextLost) {
      this.pipeline.buildPasses(this.activeEffects);
    }
  }
  updateParams(options) {
    for (const [key, val] of Object.entries(options)) {
      if (val === undefined)
        continue;
      if (typeof val === "object" && val !== null) {
        if (val.enabled === false) {
          delete this.params[key];
          this.activeEffects = this.activeEffects.filter((e) => e.name !== key);
        } else if (this.params[key]) {
          Object.assign(this.params[key], val);
        } else {
          const effectMap = {};
          for (const e of allEffects)
            effectMap[e.name] = e;
          const effect = effectMap[key];
          if (effect) {
            this.params[key] = { ...effect.defaultParams, ...val };
            this.activeEffects.push(effect);
          }
        }
      }
    }
    if (!this.contextLost) {
      this.pipeline.buildPasses(this.activeEffects);
    }
  }
  async loadImage(source) {
    const gl = this.gl;
    let img;
    if (typeof source === "string") {
      img = await loadImageFromURL(source);
    } else if (source instanceof File || source instanceof Blob) {
      const url = URL.createObjectURL(source);
      try {
        img = await loadImageFromURL(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    } else if (source instanceof ImageData) {
      const c = document.createElement("canvas");
      c.width = source.width;
      c.height = source.height;
      const ctx = c.getContext("2d");
      ctx.putImageData(source, 0, 0);
      img = c;
    } else {
      img = source;
    }
    if (img instanceof HTMLImageElement) {
      this.imageWidth = img.naturalWidth;
      this.imageHeight = img.naturalHeight;
    } else if (img instanceof HTMLCanvasElement) {
      this.imageWidth = img.width;
      this.imageHeight = img.height;
    } else if (img instanceof ImageBitmap) {
      this.imageWidth = img.width;
      this.imageHeight = img.height;
    } else {
      this.imageWidth = img.width || this.canvas.width;
      this.imageHeight = img.height || this.canvas.height;
    }
    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture);
    }
    this.sourceTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.pipeline.resize(this.imageWidth, this.imageHeight);
    this.renderFrame(0);
  }
  renderFrame(time) {
    if (this.contextLost || !this.sourceTexture)
      return;
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.activeEffects.length === 0) {
      this.pipeline.renderPassthrough(this.sourceTexture, this.passthroughProgram);
    } else {
      this.pipeline.render(this.sourceTexture, this.params, time);
    }
  }
  start() {
    if (this.animFrameId !== null)
      return;
    this.startTime = performance.now();
    const loop = (now) => {
      const t = (now - this.startTime) / 1000;
      this.renderFrame(t);
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }
  stop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }
  renderOnce() {
    this.renderFrame(performance.now() / 1000);
  }
  rebuildAll() {
    this.passthroughProgram = createProgram(this.gl, VERTEX_SHADER, PASSTHROUGH_FRAGMENT);
    this.pipeline = new Pipeline(this.gl);
    if (this.imageWidth > 0) {
      this.pipeline.resize(this.imageWidth, this.imageHeight);
    }
    this.pipeline.buildPasses(this.activeEffects);
  }
  dispose() {
    this.stop();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    const gl = this.gl;
    this.pipeline.dispose();
    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture);
      this.sourceTexture = null;
    }
    gl.deleteProgram(this.passthroughProgram);
  }
}
function loadImageFromURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image;
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

// src/export.ts
function exportDataURL(canvas, mimeType = "image/png", quality) {
  return canvas.toDataURL(mimeType, quality);
}
function exportBlob(canvas, mimeType = "image/png", quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob)
        resolve(blob);
      else
        reject(new Error("Failed to export canvas to blob"));
    }, mimeType, quality);
  });
}
function exportToCanvas(sourceCanvas, targetCanvas) {
  const target = targetCanvas || document.createElement("canvas");
  target.width = sourceCanvas.width;
  target.height = sourceCanvas.height;
  const ctx = target.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0);
  return target;
}

// src/presets.ts
var presets = {
  trinitron: {
    phosphor: { style: "aperture-grille", scale: 1, intensity: 0.4 },
    scanlines: { intensity: 0.3, count: 800, sharpness: 0.4 },
    bloom: { radius: 3, strength: 0.2, threshold: 0.8 },
    chromatic: { offset: 1 },
    vignette: { strength: 0.15, radius: 0.85 },
    curvature: { amount: 0.01 },
    noise: { intensity: 0.01, flickerIntensity: 0.01 }
  },
  arcade: {
    phosphor: { style: "arcade", scale: 1.5, intensity: 0.7 },
    scanlines: { intensity: 0.8, count: 600, sharpness: 0.7 },
    bloom: { radius: 5, strength: 0.4, threshold: 0.6 },
    chromatic: { offset: 3 },
    vignette: { strength: 0.4, radius: 0.7 },
    curvature: { amount: 0.04 },
    noise: { intensity: 0.06, flickerIntensity: 0.04 }
  },
  pvm: {
    phosphor: { style: "pvm", scale: 0.8, intensity: 0.3 },
    scanlines: { intensity: 0.25, count: 1000, sharpness: 0.5 },
    bloom: { radius: 2, strength: 0.15, threshold: 0.85 },
    chromatic: { offset: 0.5 },
    vignette: { strength: 0.1, radius: 0.9 },
    noise: { intensity: 0.005, flickerIntensity: 0.005 }
  },
  vhs: {
    phosphor: { style: "composite", scale: 1.2, intensity: 0.4 },
    scanlines: { intensity: 0.2, count: 500, sharpness: 0.2 },
    colorBleed: { amount: 0.01, direction: 0 },
    chromatic: { offset: 4 },
    noise: { intensity: 0.12, flickerIntensity: 0.08, speed: 2 },
    vignette: { strength: 0.2, radius: 0.75 }
  },
  terminal: {
    phosphor: { style: "mono-green", scale: 1, intensity: 0.8 },
    scanlines: { intensity: 0.6, count: 900, sharpness: 0.6 },
    bloom: { radius: 5, strength: 0.5, threshold: 0.5 },
    curvature: { amount: 0.03 },
    vignette: { strength: 0.3, radius: 0.8 },
    noise: { intensity: 0.04, flickerIntensity: 0.02 }
  },
  amberTerminal: {
    phosphor: { style: "mono-amber", scale: 1, intensity: 0.8 },
    scanlines: { intensity: 0.6, count: 900, sharpness: 0.6 },
    bloom: { radius: 5, strength: 0.5, threshold: 0.5 },
    curvature: { amount: 0.03 },
    vignette: { strength: 0.3, radius: 0.8 },
    noise: { intensity: 0.04, flickerIntensity: 0.02 }
  },
  consumer90s: {
    phosphor: { style: "slot-mask", scale: 1.3, intensity: 0.5 },
    scanlines: { intensity: 0.5, count: 700, sharpness: 0.4 },
    vignette: { strength: 0.5, radius: 0.65 },
    curvature: { amount: 0.03 },
    noise: { intensity: 0.04, flickerIntensity: 0.03 },
    chromatic: { offset: 2 },
    colorBleed: { amount: 0.003 }
  },
  pcMonitor: {
    phosphor: { style: "vga", scale: 1, intensity: 0.35 },
    scanlines: { intensity: 0.2, count: 1080, sharpness: 0.6 },
    bloom: { radius: 2, strength: 0.1, threshold: 0.9 },
    vignette: { strength: 0.1, radius: 0.9 },
    curvature: { amount: 0.01 },
    noise: { intensity: 0.01, flickerIntensity: 0.005 }
  },
  retrogaming: {
    phosphor: { style: "shadow-mask", scale: 1.2, intensity: 0.5 },
    scanlines: { intensity: 0.5, count: 480, sharpness: 0.5 },
    bloom: { radius: 3, strength: 0.25, threshold: 0.7 },
    chromatic: { offset: 1.5 },
    vignette: { strength: 0.25, radius: 0.8 },
    curvature: { amount: 0.02 },
    noise: { intensity: 0.03, flickerIntensity: 0.02 }
  },
  cinematic: {
    phosphor: { style: "aperture-grille", scale: 0.9, intensity: 0.25 },
    scanlines: { intensity: 0.15, count: 1080, sharpness: 0.3 },
    bloom: { radius: 6, strength: 0.4, threshold: 0.6 },
    vignette: { strength: 0.6, radius: 0.6 },
    curvature: { amount: 0.005 },
    chromatic: { offset: 0.8 },
    noise: { intensity: 0.015, flickerIntensity: 0.01 }
  }
};

// src/index.ts
class CRTEffect {
  renderer;
  constructor(canvas, options = {}) {
    this.renderer = new Renderer(canvas, options);
  }
  async loadImage(source) {
    return this.renderer.loadImage(source);
  }
  start() {
    this.renderer.start();
  }
  stop() {
    this.renderer.stop();
  }
  renderOnce() {
    this.renderer.renderOnce();
  }
  update(options) {
    this.renderer.updateParams(options);
    this.renderer.renderOnce();
  }
  setOptions(options) {
    this.renderer.setOptions(options);
    this.renderer.renderOnce();
  }
  async exportBlob(mimeType = "image/png", quality) {
    this.renderer.renderOnce();
    return exportBlob(this.renderer.canvas, mimeType, quality);
  }
  exportDataURL(mimeType = "image/png", quality) {
    this.renderer.renderOnce();
    return exportDataURL(this.renderer.canvas, mimeType, quality);
  }
  exportToCanvas(target) {
    this.renderer.renderOnce();
    return exportToCanvas(this.renderer.canvas, target);
  }
  get canvas() {
    return this.renderer.canvas;
  }
  dispose() {
    this.renderer.dispose();
  }
}
export {
  vignette,
  scanlines,
  presets,
  phosphor,
  noise,
  exportToCanvas,
  exportDataURL,
  exportBlob,
  curvature,
  colorBleed,
  chromatic,
  bloom,
  allEffects,
  CRTEffect
};

//# debugId=597E2548DA975F2264756E2164756E21
