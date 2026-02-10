import type { Effect } from "../types.js";
import { bloom } from "./bloom.js";
import { chromatic } from "./chromatic.js";
import { colorBleed } from "./color-bleed.js";
import { curvature } from "./curvature.js";
import { noise } from "./noise.js";
import { phosphor } from "./phosphor.js";
import { scanlines } from "./scanlines.js";
import { vignette } from "./vignette.js";

export { scanlines, phosphor, chromatic, bloom, vignette, curvature, noise, colorBleed };

/** All effects in recommended pipeline order */
export const allEffects: Effect[] = [
	curvature,
	colorBleed,
	chromatic,
	phosphor,
	scanlines,
	noise,
	bloom,
	vignette,
];
