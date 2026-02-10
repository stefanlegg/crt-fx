import { $ } from "bun";

await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	format: "esm",
	target: "browser",
	minify: false,
	sourcemap: "external",
});

// Generate declaration files
await $`./node_modules/.bin/tsc --emitDeclarationOnly --declaration --declarationDir dist`.quiet();

console.log("Build complete → dist/");
