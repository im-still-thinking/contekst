import { $ } from "bun";

await $`rm -rf dist && mkdir -p dist`;
await $`cp manifest.json dist/manifest.json`;
await Bun.build({
  entrypoints: ["src/popup.tsx", "src/chatgpt-content.ts"],
  outdir: "dist",
  splitting: false,
  minify: true,
  target: "browser",
});
await $`cp popup.html dist/popup.html`;
console.log("[extension] production build ready in dist/");


