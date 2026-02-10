import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: {
			"crt-fx": path.resolve(__dirname, "../src/index.ts"),
		},
	},
	build: {
		outDir: "../docs",
		emptyOutDir: true,
	},
	server: {
		port: 3000,
		open: false,
	},
});
