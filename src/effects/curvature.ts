import type { Effect } from "../types.js";

export const curvature: Effect = {
	name: "curvature",

	defaultParams: {
		amount: 0.02,
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
	},
};
