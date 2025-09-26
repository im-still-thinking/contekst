import { $ } from "bun";

await $`mkdir -p dist`;
await $`cp manifest.json dist/manifest.json`;
await Bun.build({
  entrypoints: ["src/popup.tsx", "src/chatgpt-content.ts"],
  outdir: "dist",
  splitting: false,
  target: "browser",
});
await $`cp popup.html dist/popup.html`;
console.log("[extension] built to dist/ . Load as unpacked extension.");


