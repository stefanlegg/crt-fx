import type { Effect } from "../types.js";

export const phosphor: Effect = {
	name: "phosphor",

	defaultParams: {
		style: "shadow-mask",
		scale: 1.0,
		intensity: 0.5,
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
		const styleMap: Record<string, number> = {
			"shadow-mask": 0,
			"aperture-grille": 1,
			"slot-mask": 2,
			cromaclear: 3,
			pvm: 4,
			arcade: 5,
			vga: 6,
			composite: 7,
			"mono-green": 8,
			"mono-amber": 9,
		};
		const styleIdx = styleMap[params.style as string] ?? 0;
		gl.uniform1i(gl.getUniformLocation(program, "u_style"), styleIdx);
		gl.uniform1f(gl.getUniformLocation(program, "u_scale"), params.scale ?? 1.0);
		gl.uniform1f(gl.getUniformLocation(program, "u_intensity"), params.intensity ?? 0.5);
		gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
	},
};
