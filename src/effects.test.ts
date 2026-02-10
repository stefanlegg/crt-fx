import { describe, expect, test } from "bun:test";
import {
	allEffects,
	bloom,
	chromatic,
	colorBleed,
	curvature,
	noise,
	phosphor,
	scanlines,
	vignette,
} from "./effects/index.js";

describe("effects", () => {
	test("allEffects contains all individual effects", () => {
		expect(allEffects).toContain(scanlines);
		expect(allEffects).toContain(phosphor);
		expect(allEffects).toContain(chromatic);
		expect(allEffects).toContain(bloom);
		expect(allEffects).toContain(vignette);
		expect(allEffects).toContain(curvature);
		expect(allEffects).toContain(noise);
		expect(allEffects).toContain(colorBleed);
	});

	test("each effect has required properties", () => {
		for (const effect of allEffects) {
			expect(effect.name).toBeString();
			expect(effect.fragmentShader).toBeString();
			expect(effect.fragmentShader.length).toBeGreaterThan(0);
			expect(effect.defaultParams).toBeDefined();
			expect(typeof effect.setUniforms).toBe("function");
		}
	});

	test("effect names are unique", () => {
		const names = allEffects.map((e) => e.name);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	test("fragment shaders contain main function", () => {
		for (const effect of allEffects) {
			expect(effect.fragmentShader).toContain("void main");
		}
	});
});
