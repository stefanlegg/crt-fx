import type { ImageSource, CRTOptions } from '../types.js';
export declare class Renderer {
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    private pipeline;
    private sourceTexture;
    private passthroughProgram;
    private animFrameId;
    private startTime;
    private params;
    private activeEffects;
    private imageWidth;
    private imageHeight;
    private contextLost;
    private onContextLost;
    private onContextRestored;
    private resizeObserver;
    constructor(canvas: HTMLCanvasElement, options?: CRTOptions);
    private handleResize;
    setOptions(options: CRTOptions): void;
    updateParams(options: CRTOptions): void;
    loadImage(source: ImageSource): Promise<void>;
    private renderFrame;
    start(): void;
    stop(): void;
    /** Render a single frame (for static export) */
    renderOnce(): void;
    private rebuildAll;
    dispose(): void;
}
