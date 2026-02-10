import type { Effect } from "../types.js";

export const chromatic: Effect = {
	name: "chromatic",

	defaultParams: {
		offset: 2.0,
		angle: 0,
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
		gl.uniform1f(gl.getUniformLocation(program, "u_offset"), params.offset ?? 2.0);
		gl.uniform1f(gl.getUniformLocation(program, "u_angle"), params.angle ?? 0);
		gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
	},
};
