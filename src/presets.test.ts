import { describe, expect, test } from "bun:test";
import { presets } from "./presets.js";

const PRESET_NAMES = [
	"trinitron",
	"arcade",
	"pvm",
	"vhs",
	"terminal",
	"amberTerminal",
	"consumer90s",
	"pcMonitor",
	"retrogaming",
	"cinematic",
];

describe("presets", () => {
	test("exports all expected presets", () => {
		for (const name of PRESET_NAMES) {
			expect(presets[name]).toBeDefined();
		}
	});

	test("each preset is a valid options object", () => {
		for (const [name, preset] of Object.entries(presets)) {
			expect(typeof preset).toBe("object");
			expect(preset).not.toBeNull();
			// Should have at least one effect configured
			expect(Object.keys(preset).length).toBeGreaterThan(0);
		}
	});

	test("phosphor presets have valid style strings", () => {
		const validStyles = [
			"shadow-mask",
			"aperture-grille",
			"slot-mask",
			"cromaclear",
			"pvm",
			"arcade",
			"vga",
			"composite",
			"mono-green",
			"mono-amber",
		];

		for (const [name, preset] of Object.entries(presets)) {
			if (preset.phosphor) {
				expect(validStyles).toContain(preset.phosphor.style);
			}
		}
	});

	test("numeric parameters are within reasonable ranges", () => {
		for (const [name, preset] of Object.entries(presets)) {
			if (preset.scanlines) {
				expect(preset.scanlines.intensity).toBeGreaterThanOrEqual(0);
				expect(preset.scanlines.intensity).toBeLessThanOrEqual(1);
			}
			if (preset.vignette) {
				expect(preset.vignette.strength).toBeGreaterThanOrEqual(0);
				expect(preset.vignette.strength).toBeLessThanOrEqual(1);
			}
			if (preset.bloom) {
				expect(preset.bloom.threshold).toBeGreaterThanOrEqual(0);
				expect(preset.bloom.threshold).toBeLessThanOrEqual(1);
			}
		}
	});
});
