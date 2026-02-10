import type { CRTOptions, ImageSource } from "./types.js";
export declare class CRTEffect {
    private renderer;
    constructor(canvas: HTMLCanvasElement, options?: CRTOptions);
    /** Load an image source to apply effects to */
    loadImage(source: ImageSource): Promise<void>;
    /** Start the animation loop (for time-based effects like noise/flicker) */
    start(): void;
    /** Stop the animation loop */
    stop(): void;
    /** Render a single frame */
    renderOnce(): void;
    /** Deep-merge update options (add, modify, or disable effects) */
    update(options: CRTOptions): void;
    /** Replace all options */
    setOptions(options: CRTOptions): void;
    /** Export as Blob */
    exportBlob(mimeType?: string, quality?: number): Promise<Blob>;
    /** Export as data URL */
    exportDataURL(mimeType?: string, quality?: number): string;
    /** Copy rendered output to another canvas */
    exportToCanvas(target?: HTMLCanvasElement): HTMLCanvasElement;
    /** Get the underlying canvas element */
    get canvas(): HTMLCanvasElement;
    /** Cleanup all WebGL resources */
    dispose(): void;
}
export { presets } from "./presets.js";
export { allEffects } from "./effects/index.js";
export { scanlines, phosphor, chromatic, bloom, vignette, curvature, noise, colorBleed, } from "./effects/index.js";
export { exportBlob, exportDataURL, exportToCanvas } from "./export.js";
export type { CRTOptions, ImageSource, Effect, MultiPassEffect, PhosphorStyle, ScanlineParams, ChromaticParams, BloomParams, PhosphorParams, NoiseParams, VignetteParams, CurvatureParams, ColorBleedParams, } from "./types.js";
