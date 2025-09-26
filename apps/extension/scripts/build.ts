import { $ } from "bun";

await $`rm -rf dist && mkdir -p dist`;
await $`cp src/manifest.json dist/manifest.json`;
await Bun.build({
  entrypoints: ["src/popup.tsx"],
  outdir: "dist",
  splitting: false,
  minify: true,
  target: "browser",
});
await $`cp src/popup.html dist/popup.html`;
console.log("[extension] production build ready in dist/");


