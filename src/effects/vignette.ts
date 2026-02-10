import type { Effect } from "../types.js";

export const vignette: Effect = {
	name: "vignette",

	defaultParams: {
		strength: 0.3,
		radius: 0.8,
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
	},
};
