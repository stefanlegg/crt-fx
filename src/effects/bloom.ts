import type { Effect } from "../types.js";

export const bloom: Effect = {
	name: "bloom",

	defaultParams: {
		radius: 4,
		strength: 0.3,
		threshold: 0.7,
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
	},
};
