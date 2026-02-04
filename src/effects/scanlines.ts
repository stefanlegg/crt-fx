import type { Effect } from '../types.js';

export const scanlines: Effect = {
  name: 'scanlines',

  defaultParams: {
    intensity: 0.5,
    count: 800,
    sharpness: 0.5,
    phase: 0,
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
    gl.uniform1f(gl.getUniformLocation(program, 'u_intensity'), params.intensity ?? 0.5);
    gl.uniform1f(gl.getUniformLocation(program, 'u_count'), params.count ?? 800);
    gl.uniform1f(gl.getUniformLocation(program, 'u_sharpness'), params.sharpness ?? 0.5);
    gl.uniform1f(gl.getUniformLocation(program, 'u_phase'), (params.phase ?? 0) + time * 0.5);
    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), resolution[0], resolution[1]);
  },
};
