# CRT-FX

WebGL shader-based CRT monitor effect library. Applies retro phosphor masks, scanlines, chromatic aberration, bloom, barrel distortion, noise, and more to any image — all running in real-time on the GPU.

## Install

```bash
bun add crt-fx
# or
npm install crt-fx
```

## Quick Start

```typescript
import { CRTEffect, presets } from 'crt-fx';

const canvas = document.querySelector('canvas');
const crt = new CRTEffect(canvas, presets.trinitron);

await crt.loadImage('photo.jpg');
crt.start(); // animated loop (noise/flicker)
```

## API

### `new CRTEffect(canvas, options?)`

Create a CRT effect processor attached to a canvas element.

```typescript
const crt = new CRTEffect(canvas, {
  scanlines: { intensity: 0.7, count: 800, sharpness: 0.5 },
  chromatic: { offset: 2.5 },
  bloom: { radius: 4, strength: 0.3, threshold: 0.7 },
  phosphor: { style: 'aperture-grille', scale: 1.0, intensity: 0.5 },
  noise: { intensity: 0.05, flickerIntensity: 0.03 },
  vignette: { strength: 0.3, radius: 0.8 },
  curvature: { amount: 0.02 },
  colorBleed: { amount: 0.003 },
});
```

### `crt.loadImage(source)`

Load an image. Accepts: `HTMLImageElement`, URL string, `File`, `ImageBitmap`, `ImageData`, or `HTMLCanvasElement`.

### `crt.start()` / `crt.stop()`

Start/stop the animation loop (for time-varying effects like noise and flicker).

### `crt.update(options)`

Deep-merge update specific effect parameters in real time.

### `crt.exportBlob(mimeType?)` / `crt.exportDataURL(mimeType?)`

Export the current rendered frame.

### `crt.dispose()`

Clean up all WebGL resources.

## Effects

| Effect | Key | Description |
|--------|-----|-------------|
| Barrel Distortion | `curvature` | CRT screen curve |
| Color Bleed | `colorBleed` | Horizontal color smearing |
| Chromatic Aberration | `chromatic` | RGB channel offset |
| Phosphor Mask | `phosphor` | 10 phosphor patterns |
| Scanlines | `scanlines` | Horizontal scanline overlay |
| Noise | `noise` | Static grain + flicker |
| Bloom | `bloom` | Glow on bright areas |
| Vignette | `vignette` | Edge darkening |

## Phosphor Styles

`shadow-mask` · `aperture-grille` · `slot-mask` · `cromaclear` · `pvm` · `arcade` · `vga` · `composite` · `mono-green` · `mono-amber`

## Presets

`trinitron` · `arcade` · `pvm` · `vhs` · `terminal` · `amberTerminal` · `consumer90s` · `pcMonitor` · `retrogaming` · `cinematic`

## Preview App

```bash
cd preview
bun install
bun run dev
```

## Build

```bash
bun install
bun run build
```

## Tech

- WebGL 1 / GLSL ES 1.0
- Zero dependencies
- Multi-pass framebuffer pipeline
- Handles canvas resize and WebGL context loss
