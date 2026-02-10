/** A single effect pass definition */
export interface Effect {
	name: string;
	defaultParams: Record<string, number | string | boolean>;
	fragmentShader: string;
	setUniforms(
		gl: WebGLRenderingContext,
		program: WebGLProgram,
		params: Record<string, any>,
		time: number,
		resolution: [number, number],
	): void;
}

/** Bloom needs multiple passes */
export interface MultiPassEffect extends Effect {
	passes: number;
	getFragmentShader(passIndex: number): string;
	setPassUniforms(
		gl: WebGLRenderingContext,
		program: WebGLProgram,
		params: Record<string, any>,
		time: number,
		resolution: [number, number],
		passIndex: number,
	): void;
}

export type PhosphorStyle =
	| "shadow-mask"
	| "aperture-grille"
	| "slot-mask"
	| "cromaclear"
	| "pvm"
	| "arcade"
	| "vga"
	| "composite"
	| "mono-green"
	| "mono-amber";

export interface ScanlineParams {
	intensity?: number;
	count?: number;
	sharpness?: number;
	phase?: number;
	enabled?: boolean;
}

export interface ChromaticParams {
	offset?: number;
	angle?: number;
	enabled?: boolean;
}

export interface BloomParams {
	radius?: number;
	strength?: number;
	threshold?: number;
	enabled?: boolean;
}

export interface PhosphorParams {
	style?: PhosphorStyle;
	scale?: number;
	intensity?: number;
	enabled?: boolean;
}

export interface NoiseParams {
	intensity?: number;
	flickerIntensity?: number;
	speed?: number;
	enabled?: boolean;
}

export interface VignetteParams {
	strength?: number;
	radius?: number;
	enabled?: boolean;
}

export interface CurvatureParams {
	amount?: number;
	enabled?: boolean;
}

export interface ColorBleedParams {
	amount?: number;
	direction?: number;
	enabled?: boolean;
}

export interface CRTOptions {
	scanlines?: ScanlineParams;
	chromatic?: ChromaticParams;
	bloom?: BloomParams;
	phosphor?: PhosphorParams;
	noise?: NoiseParams;
	vignette?: VignetteParams;
	curvature?: CurvatureParams;
	colorBleed?: ColorBleedParams;
}

export type ImageSource =
	| HTMLImageElement
	| HTMLCanvasElement
	| ImageBitmap
	| ImageData
	| string
	| File
	| Blob;

export interface FramebufferInfo {
	framebuffer: WebGLFramebuffer;
	texture: WebGLTexture;
}

export interface CompiledPass {
	program: WebGLProgram;
	effect: Effect;
	passIndex: number;
}
