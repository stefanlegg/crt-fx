import type { Effect, MultiPassEffect } from "../types.js";
export declare class Pipeline {
    private gl;
    private fbos;
    private passes;
    private quadBuffer;
    private width;
    private height;
    constructor(gl: WebGLRenderingContext);
    private setupQuad;
    private createFBO;
    /** Resize all framebuffers */
    resize(width: number, height: number): void;
    private destroyFBOs;
    /** Build shader programs for the current set of effects */
    buildPasses(effects: Effect[]): void;
    /** Run all passes, reading from sourceTexture, rendering final to canvas */
    render(sourceTexture: WebGLTexture, params: Record<string, Record<string, any>>, time: number): void;
    /** Render a passthrough (source directly to canvas) */
    renderPassthrough(sourceTexture: WebGLTexture, passthroughProgram: WebGLProgram): void;
    dispose(): void;
}
export type { MultiPassEffect };
