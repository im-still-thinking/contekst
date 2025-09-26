import { $ } from "bun";

await $`mkdir -p dist`;
await $`cp src/manifest.json dist/manifest.json`;
await Bun.build({
  entrypoints: ["src/popup.tsx"],
  outdir: "dist",
  splitting: false,
  target: "browser",
});
await $`cp src/popup.html dist/popup.html`;
console.log("[extension] built to dist/ . Load as unpacked extension.");


