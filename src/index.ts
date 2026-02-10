import { Renderer } from "./core/renderer.js";
import { exportBlob, exportDataURL, exportToCanvas } from "./export.js";
import type { CRTOptions, ImageSource } from "./types.js";

export class CRTEffect {
	private renderer: Renderer;

	constructor(canvas: HTMLCanvasElement, options: CRTOptions = {}) {
		this.renderer = new Renderer(canvas, options);
	}

	/** Load an image source to apply effects to */
	async loadImage(source: ImageSource): Promise<void> {
		return this.renderer.loadImage(source);
	}

	/** Start the animation loop (for time-based effects like noise/flicker) */
	start(): void {
		this.renderer.start();
	}

	/** Stop the animation loop */
	stop(): void {
		this.renderer.stop();
	}

	/** Render a single frame */
	renderOnce(): void {
		this.renderer.renderOnce();
	}

	/** Deep-merge update options (add, modify, or disable effects) */
	update(options: CRTOptions): void {
		this.renderer.updateParams(options);
		this.renderer.renderOnce();
	}

	/** Replace all options */
	setOptions(options: CRTOptions): void {
		this.renderer.setOptions(options);
		this.renderer.renderOnce();
	}

	/** Export as Blob */
	async exportBlob(mimeType = "image/png", quality?: number): Promise<Blob> {
		this.renderer.renderOnce();
		return exportBlob(this.renderer.canvas, mimeType, quality);
	}

	/** Export as data URL */
	exportDataURL(mimeType = "image/png", quality?: number): string {
		this.renderer.renderOnce();
		return exportDataURL(this.renderer.canvas, mimeType, quality);
	}

	/** Copy rendered output to another canvas */
	exportToCanvas(target?: HTMLCanvasElement): HTMLCanvasElement {
		this.renderer.renderOnce();
		return exportToCanvas(this.renderer.canvas, target);
	}

	/** Get the underlying canvas element */
	get canvas(): HTMLCanvasElement {
		return this.renderer.canvas;
	}

	/** Cleanup all WebGL resources */
	dispose(): void {
		this.renderer.dispose();
	}
}

// Re-export everything
export { presets } from "./presets.js";
export { allEffects } from "./effects/index.js";
export {
	scanlines,
	phosphor,
	chromatic,
	bloom,
	vignette,
	curvature,
	noise,
	colorBleed,
} from "./effects/index.js";
export { exportBlob, exportDataURL, exportToCanvas } from "./export.js";
export type {
	CRTOptions,
	ImageSource,
	Effect,
	MultiPassEffect,
	PhosphorStyle,
	ScanlineParams,
	ChromaticParams,
	BloomParams,
	PhosphorParams,
	NoiseParams,
	VignetteParams,
	CurvatureParams,
	ColorBleedParams,
} from "./types.js";
