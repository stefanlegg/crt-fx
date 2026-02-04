import type { Effect } from '../types.js';
import { scanlines } from './scanlines.js';
import { phosphor } from './phosphor.js';
import { chromatic } from './chromatic.js';
import { bloom } from './bloom.js';
import { vignette } from './vignette.js';
import { curvature } from './curvature.js';
import { noise } from './noise.js';
import { colorBleed } from './color-bleed.js';
export { scanlines, phosphor, chromatic, bloom, vignette, curvature, noise, colorBleed };
/** All effects in recommended pipeline order */
export declare const allEffects: Effect[];
