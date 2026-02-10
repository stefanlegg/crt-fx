(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))t(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&t(a)}).observe(document,{childList:!0,subtree:!0});function s(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function t(i){if(i.ep)return;i.ep=!0;const r=s(i);fetch(i.href,r)}})();const B={name:"bloom",defaultParams:{radius:4,strength:.3,threshold:.7},fragmentShader:`
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
`,setUniforms(o,e,s,t,i){o.uniform1f(o.getUniformLocation(e,"u_radius"),s.radius??4),o.uniform1f(o.getUniformLocation(e,"u_strength"),s.strength??.3),o.uniform1f(o.getUniformLocation(e,"u_threshold"),s.threshold??.7),o.uniform2f(o.getUniformLocation(e,"u_resolution"),i[0],i[1])}},W={name:"chromatic",defaultParams:{offset:2,angle:0},fragmentShader:`
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
`,setUniforms(o,e,s,t,i){o.uniform1f(o.getUniformLocation(e,"u_offset"),s.offset??2),o.uniform1f(o.getUniformLocation(e,"u_angle"),s.angle??0),o.uniform2f(o.getUniformLocation(e,"u_resolution"),i[0],i[1])}},H={name:"colorBleed",defaultParams:{amount:.003,direction:0},fragmentShader:`
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
`,setUniforms(o,e,s,t,i){o.uniform1f(o.getUniformLocation(e,"u_amount"),s.amount??.003),o.uniform1f(o.getUniformLocation(e,"u_direction"),s.direction??0),o.uniform2f(o.getUniformLocation(e,"u_resolution"),i[0],i[1])}},V={name:"curvature",defaultParams:{amount:.02},fragmentShader:`
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
`,setUniforms(o,e,s){o.uniform1f(o.getUniformLocation(e,"u_amount"),s.amount??.02)}},N={name:"noise",defaultParams:{intensity:.05,flickerIntensity:.03,speed:1},fragmentShader:`
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
`,setUniforms(o,e,s,t,i){o.uniform1f(o.getUniformLocation(e,"u_intensity"),s.intensity??.05),o.uniform1f(o.getUniformLocation(e,"u_flickerIntensity"),s.flickerIntensity??.03),o.uniform1f(o.getUniformLocation(e,"u_speed"),s.speed??1),o.uniform1f(o.getUniformLocation(e,"u_time"),t),o.uniform2f(o.getUniformLocation(e,"u_resolution"),i[0],i[1])}},G={name:"phosphor",defaultParams:{style:"shadow-mask",scale:1,intensity:.5},fragmentShader:`
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
`,setUniforms(o,e,s,t,i){const a={"shadow-mask":0,"aperture-grille":1,"slot-mask":2,cromaclear:3,pvm:4,arcade:5,vga:6,composite:7,"mono-green":8,"mono-amber":9}[s.style]??0;o.uniform1i(o.getUniformLocation(e,"u_style"),a),o.uniform1f(o.getUniformLocation(e,"u_scale"),s.scale??1),o.uniform1f(o.getUniformLocation(e,"u_intensity"),s.intensity??.5),o.uniform2f(o.getUniformLocation(e,"u_resolution"),i[0],i[1])}},X={name:"scanlines",defaultParams:{intensity:.5,count:800,sharpness:.5,phase:0},fragmentShader:`
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
`,setUniforms(o,e,s,t,i){o.uniform1f(o.getUniformLocation(e,"u_intensity"),s.intensity??.5),o.uniform1f(o.getUniformLocation(e,"u_count"),s.count??800),o.uniform1f(o.getUniformLocation(e,"u_sharpness"),s.sharpness??.5),o.uniform1f(o.getUniformLocation(e,"u_phase"),(s.phase??0)+t*.5),o.uniform2f(o.getUniformLocation(e,"u_resolution"),i[0],i[1])}},j={name:"vignette",defaultParams:{strength:.3,radius:.8},fragmentShader:`
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
`,setUniforms(o,e,s){o.uniform1f(o.getUniformLocation(e,"u_strength"),s.strength??.3),o.uniform1f(o.getUniformLocation(e,"u_radius"),s.radius??.8)}},w=[V,H,W,G,X,N,B,j],_=`
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,S=`
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;function P(o,e,s){const t=o.createShader(e);if(!t)throw new Error("Failed to create shader");if(o.shaderSource(t,s),o.compileShader(t),!o.getShaderParameter(t,o.COMPILE_STATUS)){const i=o.getShaderInfoLog(t);throw o.deleteShader(t),new Error(`Shader compile error: ${i}
Source:
${s}`)}return t}function b(o,e,s){const t=P(o,o.VERTEX_SHADER,e),i=P(o,o.FRAGMENT_SHADER,s),r=o.createProgram();if(!r)throw new Error("Failed to create program");if(o.attachShader(r,t),o.attachShader(r,i),o.linkProgram(r),!o.getProgramParameter(r,o.LINK_STATUS)){const a=o.getProgramInfoLog(r);throw o.deleteProgram(r),new Error(`Program link error: ${a}`)}return o.deleteShader(t),o.deleteShader(i),r}class A{constructor(e){this.fbos=[],this.passes=[],this.quadBuffer=null,this.width=0,this.height=0,this.gl=e,this.setupQuad()}setupQuad(){const e=this.gl;this.quadBuffer=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW)}createFBO(e,s){const t=this.gl,i=t.createTexture();t.bindTexture(t.TEXTURE_2D,i),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,e,s,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE);const r=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,r),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,i,0),t.bindFramebuffer(t.FRAMEBUFFER,null),t.bindTexture(t.TEXTURE_2D,null),{framebuffer:r,texture:i}}resize(e,s){if(!(this.width===e&&this.height===s)){this.width=e,this.height=s,this.destroyFBOs();for(let t=0;t<4;t++)this.fbos.push(this.createFBO(e,s))}}destroyFBOs(){const e=this.gl;for(const s of this.fbos)e.deleteFramebuffer(s.framebuffer),e.deleteTexture(s.texture);this.fbos=[]}buildPasses(e){const s=this.gl;for(const t of this.passes)s.deleteProgram(t.program);this.passes=[];for(const t of e)if(U(t))for(let i=0;i<t.passes;i++){const r=t.getFragmentShader(i),a=b(s,_,r);this.passes.push({program:a,effect:t,passIndex:i})}else{const i=b(s,_,t.fragmentShader);this.passes.push({program:i,effect:t,passIndex:0})}}render(e,s,t){const i=this.gl;if(this.passes.length===0||this.fbos.length<2)return;const r=[this.width,this.height];let a=e,u=0;for(let d=0;d<this.passes.length;d++){const c=this.passes[d],l=d===this.passes.length-1,m=s[c.effect.name]||c.effect.defaultParams;if(l)i.bindFramebuffer(i.FRAMEBUFFER,null),i.viewport(0,0,i.drawingBufferWidth,i.drawingBufferHeight);else{const h=this.fbos[u];i.bindFramebuffer(i.FRAMEBUFFER,h.framebuffer),i.viewport(0,0,this.width,this.height)}i.useProgram(c.program),i.activeTexture(i.TEXTURE0),i.bindTexture(i.TEXTURE_2D,a);const p=i.getUniformLocation(c.program,"u_texture");i.uniform1i(p,0),U(c.effect)?c.effect.setPassUniforms(i,c.program,m,t,r,c.passIndex):c.effect.setUniforms(i,c.program,m,t,r),i.bindBuffer(i.ARRAY_BUFFER,this.quadBuffer);const f=i.getAttribLocation(c.program,"a_position");i.enableVertexAttribArray(f),i.vertexAttribPointer(f,2,i.FLOAT,!1,0,0),i.drawArrays(i.TRIANGLES,0,6),l||(a=this.fbos[u].texture,u=(u+1)%this.fbos.length)}}renderPassthrough(e,s){const t=this.gl;t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,t.drawingBufferWidth,t.drawingBufferHeight),t.useProgram(s),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,e),t.uniform1i(t.getUniformLocation(s,"u_texture"),0),t.bindBuffer(t.ARRAY_BUFFER,this.quadBuffer);const i=t.getAttribLocation(s,"a_position");t.enableVertexAttribArray(i),t.vertexAttribPointer(i,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6)}dispose(){const e=this.gl;this.destroyFBOs();for(const s of this.passes)e.deleteProgram(s.program);this.passes=[],this.quadBuffer&&(e.deleteBuffer(this.quadBuffer),this.quadBuffer=null)}}function U(o){return"passes"in o&&typeof o.passes=="number"}class z{constructor(e,s={}){this.sourceTexture=null,this.animFrameId=null,this.startTime=0,this.params={},this.activeEffects=[],this.imageWidth=0,this.imageHeight=0,this.contextLost=!1,this.resizeObserver=null,this.canvas=e;const t=e.getContext("webgl",{alpha:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!0,antialias:!1});if(!t)throw new Error("WebGL not supported");this.gl=t,this.pipeline=new A(t),this.passthroughProgram=b(t,_,S),this.setOptions(s),this.onContextLost=i=>{i.preventDefault(),this.contextLost=!0,this.animFrameId!==null&&(cancelAnimationFrame(this.animFrameId),this.animFrameId=null)},this.onContextRestored=()=>{this.contextLost=!1,this.rebuildAll()},e.addEventListener("webglcontextlost",this.onContextLost),e.addEventListener("webglcontextrestored",this.onContextRestored),this.resizeObserver=new ResizeObserver(()=>this.handleResize()),this.resizeObserver.observe(e)}handleResize(){const e=window.devicePixelRatio||1,s=this.canvas.getBoundingClientRect(),t=Math.round(s.width*e),i=Math.round(s.height*e);(this.canvas.width!==t||this.canvas.height!==i)&&(this.canvas.width=t,this.canvas.height=i,this.imageWidth>0&&this.pipeline.resize(this.imageWidth,this.imageHeight))}setOptions(e){const s={};for(const i of w)s[i.name]=i;this.params={},this.activeEffects=[];const t=["curvature","colorBleed","chromatic","phosphor","scanlines","noise","bloom","vignette"];for(const i of t){const r=e[i];if(r===void 0||r.enabled===!1)continue;const a=s[i];a&&(this.params[i]={...a.defaultParams,...r},this.activeEffects.push(a))}this.contextLost||this.pipeline.buildPasses(this.activeEffects)}updateParams(e){for(const[s,t]of Object.entries(e))if(t!==void 0&&typeof t=="object"&&t!==null)if(t.enabled===!1)delete this.params[s],this.activeEffects=this.activeEffects.filter(i=>i.name!==s);else if(this.params[s])Object.assign(this.params[s],t);else{const i={};for(const a of w)i[a.name]=a;const r=i[s];r&&(this.params[s]={...r.defaultParams,...t},this.activeEffects.push(r))}this.contextLost||this.pipeline.buildPasses(this.activeEffects)}async loadImage(e){const s=this.gl;let t;if(typeof e=="string")t=await I(e);else if(e instanceof File||e instanceof Blob){const i=URL.createObjectURL(e);try{t=await I(i)}finally{URL.revokeObjectURL(i)}}else if(e instanceof ImageData){const i=document.createElement("canvas");i.width=e.width,i.height=e.height,i.getContext("2d").putImageData(e,0,0),t=i}else t=e;t instanceof HTMLImageElement?(this.imageWidth=t.naturalWidth,this.imageHeight=t.naturalHeight):t instanceof HTMLCanvasElement?(this.imageWidth=t.width,this.imageHeight=t.height):t instanceof ImageBitmap?(this.imageWidth=t.width,this.imageHeight=t.height):(this.imageWidth=t.width||this.canvas.width,this.imageHeight=t.height||this.canvas.height),this.sourceTexture&&s.deleteTexture(this.sourceTexture),this.sourceTexture=s.createTexture(),s.bindTexture(s.TEXTURE_2D,this.sourceTexture),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,1),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,s.RGBA,s.UNSIGNED_BYTE,t),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),s.bindTexture(s.TEXTURE_2D,null),this.pipeline.resize(this.imageWidth,this.imageHeight),this.renderFrame(0)}renderFrame(e){if(this.contextLost||!this.sourceTexture)return;const s=this.gl;s.clearColor(0,0,0,1),s.clear(s.COLOR_BUFFER_BIT),this.activeEffects.length===0?this.pipeline.renderPassthrough(this.sourceTexture,this.passthroughProgram):this.pipeline.render(this.sourceTexture,this.params,e)}start(){if(this.animFrameId!==null)return;this.startTime=performance.now();const e=s=>{const t=(s-this.startTime)/1e3;this.renderFrame(t),this.animFrameId=requestAnimationFrame(e)};this.animFrameId=requestAnimationFrame(e)}stop(){this.animFrameId!==null&&(cancelAnimationFrame(this.animFrameId),this.animFrameId=null)}renderOnce(){this.renderFrame(performance.now()/1e3)}rebuildAll(){this.passthroughProgram=b(this.gl,_,S),this.pipeline=new A(this.gl),this.imageWidth>0&&this.pipeline.resize(this.imageWidth,this.imageHeight),this.pipeline.buildPasses(this.activeEffects)}dispose(){this.stop(),this.canvas.removeEventListener("webglcontextlost",this.onContextLost),this.canvas.removeEventListener("webglcontextrestored",this.onContextRestored),this.resizeObserver&&(this.resizeObserver.disconnect(),this.resizeObserver=null);const e=this.gl;this.pipeline.dispose(),this.sourceTexture&&(e.deleteTexture(this.sourceTexture),this.sourceTexture=null),e.deleteProgram(this.passthroughProgram)}}function I(o){return new Promise((e,s)=>{const t=new Image;t.crossOrigin="anonymous",t.onload=()=>e(t),t.onerror=()=>s(new Error(`Failed to load image: ${o}`)),t.src=o})}function $(o,e="image/png",s){return o.toDataURL(e,s)}function Y(o,e="image/png",s){return new Promise((t,i)=>{o.toBlob(r=>{r?t(r):i(new Error("Failed to export canvas to blob"))},e,s)})}function q(o,e){const s=e||document.createElement("canvas");return s.width=o.width,s.height=o.height,s.getContext("2d").drawImage(o,0,0),s}const T={trinitron:{phosphor:{style:"aperture-grille",scale:1,intensity:.4},scanlines:{intensity:.3,count:800,sharpness:.4},bloom:{radius:3,strength:.2,threshold:.8},chromatic:{offset:1},vignette:{strength:.15,radius:.85},curvature:{amount:.01},noise:{intensity:.01,flickerIntensity:.01}},arcade:{phosphor:{style:"arcade",scale:1.5,intensity:.7},scanlines:{intensity:.8,count:600,sharpness:.7},bloom:{radius:5,strength:.4,threshold:.6},chromatic:{offset:3},vignette:{strength:.4,radius:.7},curvature:{amount:.04},noise:{intensity:.06,flickerIntensity:.04}},pvm:{phosphor:{style:"pvm",scale:.8,intensity:.3},scanlines:{intensity:.25,count:1e3,sharpness:.5},bloom:{radius:2,strength:.15,threshold:.85},chromatic:{offset:.5},vignette:{strength:.1,radius:.9},noise:{intensity:.005,flickerIntensity:.005}},vhs:{phosphor:{style:"composite",scale:1.2,intensity:.4},scanlines:{intensity:.2,count:500,sharpness:.2},colorBleed:{amount:.01,direction:0},chromatic:{offset:4},noise:{intensity:.12,flickerIntensity:.08,speed:2},vignette:{strength:.2,radius:.75}},terminal:{phosphor:{style:"mono-green",scale:1,intensity:.8},scanlines:{intensity:.6,count:900,sharpness:.6},bloom:{radius:5,strength:.5,threshold:.5},curvature:{amount:.03},vignette:{strength:.3,radius:.8},noise:{intensity:.04,flickerIntensity:.02}},amberTerminal:{phosphor:{style:"mono-amber",scale:1,intensity:.8},scanlines:{intensity:.6,count:900,sharpness:.6},bloom:{radius:5,strength:.5,threshold:.5},curvature:{amount:.03},vignette:{strength:.3,radius:.8},noise:{intensity:.04,flickerIntensity:.02}},consumer90s:{phosphor:{style:"slot-mask",scale:1.3,intensity:.5},scanlines:{intensity:.5,count:700,sharpness:.4},vignette:{strength:.5,radius:.65},curvature:{amount:.03},noise:{intensity:.04,flickerIntensity:.03},chromatic:{offset:2},colorBleed:{amount:.003}},pcMonitor:{phosphor:{style:"vga",scale:1,intensity:.35},scanlines:{intensity:.2,count:1080,sharpness:.6},bloom:{radius:2,strength:.1,threshold:.9},vignette:{strength:.1,radius:.9},curvature:{amount:.01},noise:{intensity:.01,flickerIntensity:.005}},retrogaming:{phosphor:{style:"shadow-mask",scale:1.2,intensity:.5},scanlines:{intensity:.5,count:480,sharpness:.5},bloom:{radius:3,strength:.25,threshold:.7},chromatic:{offset:1.5},vignette:{strength:.25,radius:.8},curvature:{amount:.02},noise:{intensity:.03,flickerIntensity:.02}},cinematic:{phosphor:{style:"aperture-grille",scale:.9,intensity:.25},scanlines:{intensity:.15,count:1080,sharpness:.3},bloom:{radius:6,strength:.4,threshold:.6},vignette:{strength:.6,radius:.6},curvature:{amount:.005},chromatic:{offset:.8},noise:{intensity:.015,flickerIntensity:.01}}};class K{constructor(e,s={}){this.renderer=new z(e,s)}async loadImage(e){return this.renderer.loadImage(e)}start(){this.renderer.start()}stop(){this.renderer.stop()}renderOnce(){this.renderer.renderOnce()}update(e){this.renderer.updateParams(e),this.renderer.renderOnce()}setOptions(e){this.renderer.setOptions(e),this.renderer.renderOnce()}async exportBlob(e="image/png",s){return this.renderer.renderOnce(),Y(this.renderer.canvas,e,s)}exportDataURL(e="image/png",s){return this.renderer.renderOnce(),$(this.renderer.canvas,e,s)}exportToCanvas(e){return this.renderer.renderOnce(),q(this.renderer.canvas,e)}get canvas(){return this.renderer.canvas}dispose(){this.renderer.dispose()}}const Q=[{value:"shadow-mask",label:"Shadow Mask"},{value:"aperture-grille",label:"Aperture Grille (Trinitron)"},{value:"slot-mask",label:"Slot Mask"},{value:"cromaclear",label:"Cromaclear (NEC)"},{value:"pvm",label:"PVM (Broadcast)"},{value:"arcade",label:"Arcade"},{value:"vga",label:"VGA (90s PC)"},{value:"composite",label:"Composite (Cheap TV)"},{value:"mono-green",label:"Mono Green"},{value:"mono-amber",label:"Mono Amber"}],v=[{name:"Curvature",key:"curvature",sliders:[{key:"amount",label:"Amount",min:0,max:.1,step:.001,defaultValue:.02}]},{name:"Color Bleed",key:"colorBleed",sliders:[{key:"amount",label:"Amount",min:0,max:.02,step:.001,defaultValue:.003},{key:"direction",label:"Direction",min:0,max:1,step:1,defaultValue:0}]},{name:"Chromatic Aberration",key:"chromatic",sliders:[{key:"offset",label:"Offset",min:0,max:10,step:.1,defaultValue:2},{key:"angle",label:"Angle",min:0,max:360,step:1,defaultValue:0}]},{name:"Phosphor",key:"phosphor",sliders:[{key:"scale",label:"Scale",min:.5,max:4,step:.1,defaultValue:1},{key:"intensity",label:"Intensity",min:0,max:1,step:.01,defaultValue:.5}],dropdowns:[{key:"style",label:"Style",options:Q,defaultValue:"shadow-mask"}]},{name:"Scanlines",key:"scanlines",sliders:[{key:"intensity",label:"Intensity",min:0,max:1,step:.01,defaultValue:.5},{key:"count",label:"Count",min:100,max:2e3,step:10,defaultValue:800},{key:"sharpness",label:"Sharpness",min:0,max:1,step:.01,defaultValue:.5}]},{name:"Noise",key:"noise",sliders:[{key:"intensity",label:"Intensity",min:0,max:.3,step:.005,defaultValue:.05},{key:"flickerIntensity",label:"Flicker",min:0,max:.2,step:.005,defaultValue:.03},{key:"speed",label:"Speed",min:.1,max:5,step:.1,defaultValue:1}]},{name:"Bloom",key:"bloom",sliders:[{key:"radius",label:"Radius",min:1,max:12,step:1,defaultValue:4},{key:"strength",label:"Strength",min:0,max:1,step:.01,defaultValue:.3},{key:"threshold",label:"Threshold",min:0,max:1,step:.01,defaultValue:.7}]},{name:"Vignette",key:"vignette",sliders:[{key:"strength",label:"Strength",min:0,max:1,step:.01,defaultValue:.3},{key:"radius",label:"Radius",min:.2,max:1.2,step:.01,defaultValue:.8}]}];class Z{constructor(e,s){this.state={},this.enabledState={},this.valueLabels=new Map,this.sliderInputs=new Map,this.toggleInputs=new Map,this.selectInputs=new Map,this.container=e,this.onChange=s,this.initState(),this.build()}initState(){for(const e of v){this.enabledState[e.key]=!1,this.state[e.key]={};for(const s of e.sliders)this.state[e.key][s.key]=s.defaultValue;if(e.dropdowns)for(const s of e.dropdowns)this.state[e.key][s.key]=s.defaultValue}}build(){this.container.innerHTML="";for(const e of v){const s=document.createElement("div");s.className="control-section";const t=document.createElement("div");t.className="section-header";const i=document.createElement("div");i.className="toggle-wrapper";const r=document.createElement("input");r.type="checkbox",r.className="toggle-switch",r.checked=this.enabledState[e.key],this.toggleInputs.set(e.key,r),r.addEventListener("change",()=>{this.enabledState[e.key]=r.checked,this.emitChange()});const a=document.createElement("h3");a.textContent=e.name,i.appendChild(r),i.appendChild(a);const u=document.createElement("span");u.className="section-toggle",u.textContent="▼",t.appendChild(i),t.appendChild(u);const d=document.createElement("div");d.className="section-body";let c=!1;if(t.addEventListener("click",l=>{l.target.classList.contains("toggle-switch")||(c=!c,d.classList.toggle("collapsed",c),u.classList.toggle("collapsed",c))}),e.dropdowns)for(const l of e.dropdowns){const m=document.createElement("div");m.className="dropdown-row";const p=document.createElement("label");p.textContent=l.label;const f=document.createElement("select");for(const y of l.options){const g=document.createElement("option");g.value=y.value,g.textContent=y.label,f.appendChild(g)}f.value=l.defaultValue;const h=`${e.key}.${l.key}`;this.selectInputs.set(h,f),f.addEventListener("change",()=>{this.state[e.key][l.key]=f.value,this.emitChange()}),m.appendChild(p),m.appendChild(f),d.appendChild(m)}for(const l of e.sliders){const m=document.createElement("div");m.className="slider-row";const p=document.createElement("label");p.textContent=l.label;const f=document.createElement("input");f.type="range",f.min=String(l.min),f.max=String(l.max),f.step=String(l.step),f.value=String(l.defaultValue);const h=document.createElement("span");h.className="slider-value",h.textContent=k(l.defaultValue,l.step);const y=`${e.key}.${l.key}`;this.sliderInputs.set(y,f),this.valueLabels.set(y,h),f.addEventListener("input",()=>{const g=Number.parseFloat(f.value);this.state[e.key][l.key]=g,h.textContent=k(g,l.step),this.emitChange()}),m.appendChild(p),m.appendChild(f),m.appendChild(h),d.appendChild(m)}s.appendChild(t),s.appendChild(d),this.container.appendChild(s)}}emitChange(){const e={};for(const s of v)this.enabledState[s.key]&&(e[s.key]={...this.state[s.key],enabled:!0});this.onChange(e)}applyPreset(e){for(const s of v)this.enabledState[s.key]=!1;for(const[s,t]of Object.entries(e))if(!(!t||typeof t!="object")){this.enabledState[s]=!0;for(const[i,r]of Object.entries(t))this.state[s]&&(this.state[s][i]=r)}this.syncUI(),this.emitChange()}reset(){this.initState(),this.syncUI(),this.emitChange()}syncUI(){var e,s;for(const t of v){const i=this.toggleInputs.get(t.key);i&&(i.checked=this.enabledState[t.key]);for(const r of t.sliders){const a=`${t.key}.${r.key}`,u=this.sliderInputs.get(a),d=this.valueLabels.get(a),c=((e=this.state[t.key])==null?void 0:e[r.key])??r.defaultValue;u&&(u.value=String(c)),d&&(d.textContent=k(c,r.step))}if(t.dropdowns)for(const r of t.dropdowns){const a=`${t.key}.${r.key}`,u=this.selectInputs.get(a),d=((s=this.state[t.key])==null?void 0:s[r.key])??r.defaultValue;u&&(u.value=d)}}}getCurrentOptions(){const e={};for(const s of v)this.enabledState[s.key]&&(e[s.key]={...this.state[s.key]});return e}}function k(o,e){if(e>=1)return String(Math.round(o));const s=Math.max(0,-Math.floor(Math.log10(e)));return o.toFixed(Math.min(s,3))}function J(o,e,s){let t=0;o.addEventListener("dragenter",i=>{i.preventDefault(),t++,o.classList.add("drag-over"),e.classList.remove("hidden")}),o.addEventListener("dragleave",i=>{i.preventDefault(),t--,t<=0&&(t=0,o.classList.remove("drag-over"))}),o.addEventListener("dragover",i=>{i.preventDefault()}),o.addEventListener("drop",i=>{var a;i.preventDefault(),t=0,o.classList.remove("drag-over");const r=(a=i.dataTransfer)==null?void 0:a.files;if(r&&r.length>0){const u=r[0];u.type.startsWith("image/")&&s(u)}})}function ee(o,e){for(const s of Object.keys(e)){const t=document.createElement("option");t.value=s,t.textContent=s.replace(/([A-Z])/g," $1").replace(/^./,i=>i.toUpperCase()),o.appendChild(t)}}const te=document.getElementById("crt-canvas"),se=document.getElementById("drop-zone"),L=document.getElementById("drop-overlay"),F=document.getElementById("file-input"),E=document.getElementById("preset-select"),oe=document.getElementById("controls-container"),C=document.getElementById("animate-toggle"),ie=document.getElementById("export-btn"),re=document.getElementById("reset-btn");let n=null,x=!1,R=!1;function D(o={}){return n&&n.dispose(),n=new K(te,o),n}function ae(o){n?n.setOptions(o):n=D(o),x&&n.start()}const O=new Z(oe,ae);n=D({});async function M(o){n&&(L.classList.add("hidden"),await n.loadImage(o),R=!0,x&&n.start())}async function ne(){const o=document.createElement("canvas");o.width=640,o.height=480;const e=o.getContext("2d");e.fillStyle="#111",e.fillRect(0,0,640,480);const s=["#fff","#ff0","#0ff","#0f0","#f0f","#f00","#00f"],t=640/s.length;for(let r=0;r<s.length;r++)e.fillStyle=s[r],e.fillRect(r*t,40,t,300);const i=e.createLinearGradient(0,360,640,360);i.addColorStop(0,"#000"),i.addColorStop(1,"#fff"),e.fillStyle=i,e.fillRect(0,350,640,40),e.fillStyle="#33ff33",e.font="bold 24px monospace",e.textAlign="center",e.fillText("CRT-FX TEST PATTERN",320,28),e.fillStyle="#ffb000",e.font="14px monospace",e.fillText("Drop an image or use File > Load Image",320,420),e.fillText("640×480 · WebGL",320,445),e.strokeStyle="#333",e.lineWidth=1;for(let r=40;r<240;r+=40)e.beginPath(),e.arc(320,200,r,0,Math.PI*2),e.stroke();e.strokeStyle="#222";for(let r=0;r<640;r+=40)e.beginPath(),e.moveTo(r,0),e.lineTo(r,480),e.stroke();for(let r=0;r<480;r+=40)e.beginPath(),e.moveTo(0,r),e.lineTo(640,r),e.stroke();n&&(await n.loadImage(o),R=!0,L.classList.add("hidden"))}J(se,L,M);F.addEventListener("change",()=>{var e;const o=(e=F.files)==null?void 0:e[0];o&&M(o)});ee(E,T);E.addEventListener("change",()=>{const o=E.value;o&&T[o]&&O.applyPreset(T[o])});C.addEventListener("click",()=>{x=!x,x?(C.textContent="⏸ Stop",n==null||n.start()):(C.textContent="▶ Animate",n==null||n.stop())});ie.addEventListener("click",async()=>{if(!n||!R)return;const o=await n.exportBlob("image/png"),e=URL.createObjectURL(o),s=document.createElement("a");s.href=e,s.download="crt-export.png",s.click(),URL.revokeObjectURL(e)});re.addEventListener("click",()=>{E.value="",O.reset()});ne();
