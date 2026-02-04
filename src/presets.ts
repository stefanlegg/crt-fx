import type { CRTOptions } from './types.js';

export const presets: Record<string, CRTOptions> = {
  trinitron: {
    phosphor: { style: 'aperture-grille', scale: 1.0, intensity: 0.4 },
    scanlines: { intensity: 0.3, count: 800, sharpness: 0.4 },
    bloom: { radius: 3, strength: 0.2, threshold: 0.8 },
    chromatic: { offset: 1.0 },
    vignette: { strength: 0.15, radius: 0.85 },
    curvature: { amount: 0.01 },
    noise: { intensity: 0.01, flickerIntensity: 0.01 },
  },

  arcade: {
    phosphor: { style: 'arcade', scale: 1.5, intensity: 0.7 },
    scanlines: { intensity: 0.8, count: 600, sharpness: 0.7 },
    bloom: { radius: 5, strength: 0.4, threshold: 0.6 },
    chromatic: { offset: 3.0 },
    vignette: { strength: 0.4, radius: 0.7 },
    curvature: { amount: 0.04 },
    noise: { intensity: 0.06, flickerIntensity: 0.04 },
  },

  pvm: {
    phosphor: { style: 'pvm', scale: 0.8, intensity: 0.3 },
    scanlines: { intensity: 0.25, count: 1000, sharpness: 0.5 },
    bloom: { radius: 2, strength: 0.15, threshold: 0.85 },
    chromatic: { offset: 0.5 },
    vignette: { strength: 0.1, radius: 0.9 },
    noise: { intensity: 0.005, flickerIntensity: 0.005 },
  },

  vhs: {
    phosphor: { style: 'composite', scale: 1.2, intensity: 0.4 },
    scanlines: { intensity: 0.2, count: 500, sharpness: 0.2 },
    colorBleed: { amount: 0.01, direction: 0 },
    chromatic: { offset: 4.0 },
    noise: { intensity: 0.12, flickerIntensity: 0.08, speed: 2.0 },
    vignette: { strength: 0.2, radius: 0.75 },
  },

  terminal: {
    phosphor: { style: 'mono-green', scale: 1.0, intensity: 0.8 },
    scanlines: { intensity: 0.6, count: 900, sharpness: 0.6 },
    bloom: { radius: 5, strength: 0.5, threshold: 0.5 },
    curvature: { amount: 0.03 },
    vignette: { strength: 0.3, radius: 0.8 },
    noise: { intensity: 0.04, flickerIntensity: 0.02 },
  },

  amberTerminal: {
    phosphor: { style: 'mono-amber', scale: 1.0, intensity: 0.8 },
    scanlines: { intensity: 0.6, count: 900, sharpness: 0.6 },
    bloom: { radius: 5, strength: 0.5, threshold: 0.5 },
    curvature: { amount: 0.03 },
    vignette: { strength: 0.3, radius: 0.8 },
    noise: { intensity: 0.04, flickerIntensity: 0.02 },
  },

  consumer90s: {
    phosphor: { style: 'slot-mask', scale: 1.3, intensity: 0.5 },
    scanlines: { intensity: 0.5, count: 700, sharpness: 0.4 },
    vignette: { strength: 0.5, radius: 0.65 },
    curvature: { amount: 0.03 },
    noise: { intensity: 0.04, flickerIntensity: 0.03 },
    chromatic: { offset: 2.0 },
    colorBleed: { amount: 0.003 },
  },

  pcMonitor: {
    phosphor: { style: 'vga', scale: 1.0, intensity: 0.35 },
    scanlines: { intensity: 0.2, count: 1080, sharpness: 0.6 },
    bloom: { radius: 2, strength: 0.1, threshold: 0.9 },
    vignette: { strength: 0.1, radius: 0.9 },
    curvature: { amount: 0.01 },
    noise: { intensity: 0.01, flickerIntensity: 0.005 },
  },

  retrogaming: {
    phosphor: { style: 'shadow-mask', scale: 1.2, intensity: 0.5 },
    scanlines: { intensity: 0.5, count: 480, sharpness: 0.5 },
    bloom: { radius: 3, strength: 0.25, threshold: 0.7 },
    chromatic: { offset: 1.5 },
    vignette: { strength: 0.25, radius: 0.8 },
    curvature: { amount: 0.02 },
    noise: { intensity: 0.03, flickerIntensity: 0.02 },
  },

  cinematic: {
    phosphor: { style: 'aperture-grille', scale: 0.9, intensity: 0.25 },
    scanlines: { intensity: 0.15, count: 1080, sharpness: 0.3 },
    bloom: { radius: 6, strength: 0.4, threshold: 0.6 },
    vignette: { strength: 0.6, radius: 0.6 },
    curvature: { amount: 0.005 },
    chromatic: { offset: 0.8 },
    noise: { intensity: 0.015, flickerIntensity: 0.01 },
  },
};
