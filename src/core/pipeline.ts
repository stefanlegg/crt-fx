import type { FramebufferInfo, Effect, MultiPassEffect, CompiledPass } from '../types.js';
import { VERTEX_SHADER, createProgram } from './shaders.js';

export class Pipeline {
  private gl: WebGLRenderingContext;
  private fbos: FramebufferInfo[] = [];
  private passes: CompiledPass[] = [];
  private quadBuffer: WebGLBuffer | null = null;
  private width = 0;
  private height = 0;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.setupQuad();
  }

  private setupQuad(): void {
    const gl = this.gl;
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    // Fullscreen triangle pair
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
  }

  private createFBO(width: number, height: number): FramebufferInfo {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return { framebuffer, texture };
  }

  /** Resize all framebuffers */
  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.destroyFBOs();
    // We need at least 2 for ping-pong, plus extras for bloom
    // Create enough — we'll use up to 4
    for (let i = 0; i < 4; i++) {
      this.fbos.push(this.createFBO(width, height));
    }
  }

  private destroyFBOs(): void {
    const gl = this.gl;
    for (const fbo of this.fbos) {
      gl.deleteFramebuffer(fbo.framebuffer);
      gl.deleteTexture(fbo.texture);
    }
    this.fbos = [];
  }

  /** Build shader programs for the current set of effects */
  buildPasses(effects: Effect[]): void {
    const gl = this.gl;
    // Clean old programs
    for (const p of this.passes) {
      gl.deleteProgram(p.program);
    }
    this.passes = [];

    for (const effect of effects) {
      if (isMultiPass(effect)) {
        for (let i = 0; i < effect.passes; i++) {
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

  /** Run all passes, reading from sourceTexture, rendering final to canvas */
  render(
    sourceTexture: WebGLTexture,
    params: Record<string, Record<string, any>>,
    time: number,
  ): void {
    const gl = this.gl;
    if (this.passes.length === 0 || this.fbos.length < 2) return;

    const resolution: [number, number] = [this.width, this.height];
    let inputTexture = sourceTexture;
    let pingPong = 0;

    for (let i = 0; i < this.passes.length; i++) {
      const pass = this.passes[i];
      const isLast = i === this.passes.length - 1;
      const effectParams = params[pass.effect.name] || pass.effect.defaultParams;

      if (isLast) {
        // Render to canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      } else {
        // Render to FBO
        const target = this.fbos[pingPong];
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, this.width, this.height);
      }

      gl.useProgram(pass.program);

      // Bind input texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, inputTexture);
      const texLoc = gl.getUniformLocation(pass.program, 'u_texture');
      gl.uniform1i(texLoc, 0);

      // Set effect uniforms
      if (isMultiPass(pass.effect)) {
        pass.effect.setPassUniforms(gl, pass.program, effectParams, time, resolution, pass.passIndex);
      } else {
        pass.effect.setUniforms(gl, pass.program, effectParams, time, resolution);
      }

      // Draw quad
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      const posLoc = gl.getAttribLocation(pass.program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (!isLast) {
        inputTexture = this.fbos[pingPong].texture;
        pingPong = (pingPong + 1) % this.fbos.length;
      }
    }
  }

  /** Render a passthrough (source directly to canvas) */
  renderPassthrough(
    sourceTexture: WebGLTexture,
    passthroughProgram: WebGLProgram,
  ): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(passthroughProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(gl.getUniformLocation(passthroughProgram, 'u_texture'), 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    const posLoc = gl.getAttribLocation(passthroughProgram, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose(): void {
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

function isMultiPass(effect: Effect): effect is MultiPassEffect {
  return 'passes' in effect && typeof (effect as any).passes === 'number';
}

export type { MultiPassEffect };
