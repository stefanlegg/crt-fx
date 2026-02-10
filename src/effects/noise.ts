import type { Effect } from "../types.js";

export const noise: Effect = {
	name: "noise",

	defaultParams: {
		intensity: 0.05,
		flickerIntensity: 0.03,
		speed: 1.0,
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
		gl.uniform1f(
			gl.getUniformLocation(program, "u_flickerIntensity"),
			params.flickerIntensity ?? 0.03,
		);
		gl.uniform1f(gl.getUniformLocation(program, "u_speed"), params.speed ?? 1.0);
		gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
		gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), resolution[0], resolution[1]);
	},
};
