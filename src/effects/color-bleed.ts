import type { Effect } from "../types.js";

export const colorBleed: Effect = {
	name: "colorBleed",

	defaultParams: {
		amount: 0.003,
		direction: 0,
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
	},
};
