import { allEffects } from "../effects/index.js";
import type { CRTOptions, Effect, ImageSource } from "../types.js";
import { Pipeline } from "./pipeline.js";
import { PASSTHROUGH_FRAGMENT, VERTEX_SHADER, createProgram } from "./shaders.js";

export class Renderer {
	public canvas: HTMLCanvasElement;
	public gl: WebGLRenderingContext;
	private pipeline: Pipeline;
	private sourceTexture: WebGLTexture | null = null;
	private passthroughProgram: WebGLProgram;
	private animFrameId: number | null = null;
	private startTime = 0;
	private params: Record<string, Record<string, any>> = {};
	private activeEffects: Effect[] = [];
	private imageWidth = 0;
	private imageHeight = 0;
	private contextLost = false;
	private onContextLost: (e: Event) => void;
	private onContextRestored: (e: Event) => void;
	private resizeObserver: ResizeObserver | null = null;

	constructor(canvas: HTMLCanvasElement, options: CRTOptions = {}) {
		this.canvas = canvas;
		const gl = canvas.getContext("webgl", {
			alpha: false,
			premultipliedAlpha: false,
			preserveDrawingBuffer: true,
			antialias: false,
		});
		if (!gl) throw new Error("WebGL not supported");
		this.gl = gl;

		this.pipeline = new Pipeline(gl);
		this.passthroughProgram = createProgram(gl, VERTEX_SHADER, PASSTHROUGH_FRAGMENT);

		// Apply options
		this.setOptions(options);

		// Context loss handling
		this.onContextLost = (e: Event) => {
			e.preventDefault();
			this.contextLost = true;
			if (this.animFrameId !== null) {
				cancelAnimationFrame(this.animFrameId);
				this.animFrameId = null;
			}
		};
		this.onContextRestored = () => {
			this.contextLost = false;
			this.rebuildAll();
		};
		canvas.addEventListener("webglcontextlost", this.onContextLost);
		canvas.addEventListener("webglcontextrestored", this.onContextRestored);

		// Observe resize
		this.resizeObserver = new ResizeObserver(() => this.handleResize());
		this.resizeObserver.observe(canvas);
	}

	private handleResize(): void {
		const dpr = window.devicePixelRatio || 1;
		const rect = this.canvas.getBoundingClientRect();
		const w = Math.round(rect.width * dpr);
		const h = Math.round(rect.height * dpr);
		if (this.canvas.width !== w || this.canvas.height !== h) {
			this.canvas.width = w;
			this.canvas.height = h;
			if (this.imageWidth > 0) {
				this.pipeline.resize(this.imageWidth, this.imageHeight);
			}
		}
	}

	setOptions(options: CRTOptions): void {
		// Map option keys → effect instances & params
		const effectMap: Record<string, Effect> = {};
		for (const e of allEffects) {
			effectMap[e.name] = e;
		}

		this.params = {};
		this.activeEffects = [];

		// Determine which effects are enabled and build params
		const effectOrder = [
			"curvature",
			"colorBleed",
			"chromatic",
			"phosphor",
			"scanlines",
			"noise",
			"bloom",
			"vignette",
		];

		for (const name of effectOrder) {
			const opts = (options as any)[name];
			if (opts === undefined) continue;
			if (opts.enabled === false) continue;

			const effect = effectMap[name];
			if (!effect) continue;

			this.params[name] = { ...effect.defaultParams, ...opts };
			this.activeEffects.push(effect);
		}

		// Rebuild pipeline
		if (!this.contextLost) {
			this.pipeline.buildPasses(this.activeEffects);
		}
	}

	updateParams(options: CRTOptions): void {
		// Deep merge into existing params
		for (const [key, val] of Object.entries(options)) {
			if (val === undefined) continue;
			if (typeof val === "object" && val !== null) {
				if ((val as any).enabled === false) {
					// Remove effect
					delete this.params[key];
					this.activeEffects = this.activeEffects.filter((e) => e.name !== key);
				} else if (this.params[key]) {
					// Merge
					Object.assign(this.params[key], val);
				} else {
					// Add new effect
					const effectMap: Record<string, Effect> = {};
					for (const e of allEffects) effectMap[e.name] = e;
					const effect = effectMap[key];
					if (effect) {
						this.params[key] = { ...effect.defaultParams, ...(val as any) };
						this.activeEffects.push(effect);
					}
				}
			}
		}
		if (!this.contextLost) {
			this.pipeline.buildPasses(this.activeEffects);
		}
	}

	async loadImage(source: ImageSource): Promise<void> {
		const gl = this.gl;
		let img: TexImageSource;

		if (typeof source === "string") {
			img = await loadImageFromURL(source);
		} else if (source instanceof File || source instanceof Blob) {
			const url = URL.createObjectURL(source);
			try {
				img = await loadImageFromURL(url);
			} finally {
				URL.revokeObjectURL(url);
			}
		} else if (source instanceof ImageData) {
			// Convert to canvas
			const c = document.createElement("canvas");
			c.width = source.width;
			c.height = source.height;
			const ctx = c.getContext("2d")!;
			ctx.putImageData(source, 0, 0);
			img = c;
		} else {
			img = source as TexImageSource;
		}

		// Get dimensions
		if (img instanceof HTMLImageElement) {
			this.imageWidth = img.naturalWidth;
			this.imageHeight = img.naturalHeight;
		} else if (img instanceof HTMLCanvasElement) {
			this.imageWidth = img.width;
			this.imageHeight = img.height;
		} else if (img instanceof ImageBitmap) {
			this.imageWidth = img.width;
			this.imageHeight = img.height;
		} else {
			this.imageWidth = (img as any).width || this.canvas.width;
			this.imageHeight = (img as any).height || this.canvas.height;
		}

		// Upload texture
		if (this.sourceTexture) {
			gl.deleteTexture(this.sourceTexture);
		}
		this.sourceTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);

		this.pipeline.resize(this.imageWidth, this.imageHeight);
		this.renderFrame(0);
	}

	private renderFrame(time: number): void {
		if (this.contextLost || !this.sourceTexture) return;
		const gl = this.gl;

		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		if (this.activeEffects.length === 0) {
			this.pipeline.renderPassthrough(this.sourceTexture, this.passthroughProgram);
		} else {
			this.pipeline.render(this.sourceTexture, this.params, time);
		}
	}

	start(): void {
		if (this.animFrameId !== null) return;
		this.startTime = performance.now();
		const loop = (now: number) => {
			const t = (now - this.startTime) / 1000;
			this.renderFrame(t);
			this.animFrameId = requestAnimationFrame(loop);
		};
		this.animFrameId = requestAnimationFrame(loop);
	}

	stop(): void {
		if (this.animFrameId !== null) {
			cancelAnimationFrame(this.animFrameId);
			this.animFrameId = null;
		}
	}

	/** Render a single frame (for static export) */
	renderOnce(): void {
		this.renderFrame(performance.now() / 1000);
	}

	private rebuildAll(): void {
		this.passthroughProgram = createProgram(this.gl, VERTEX_SHADER, PASSTHROUGH_FRAGMENT);
		this.pipeline = new Pipeline(this.gl);
		if (this.imageWidth > 0) {
			this.pipeline.resize(this.imageWidth, this.imageHeight);
		}
		this.pipeline.buildPasses(this.activeEffects);
	}

	dispose(): void {
		this.stop();
		this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
		this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
		const gl = this.gl;
		this.pipeline.dispose();
		if (this.sourceTexture) {
			gl.deleteTexture(this.sourceTexture);
			this.sourceTexture = null;
		}
		gl.deleteProgram(this.passthroughProgram);
	}
}

function loadImageFromURL(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
		img.src = url;
	});
}
