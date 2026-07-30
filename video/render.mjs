// SSR render: turn a journey JSON into an MP4 (or GIF) shareable clip.
//
//   node render.mjs [journey.json] [--codec mp4|gif] [--out out/clip.mp4]
//
// Defaults: sample-journey.json -> out/journey-clip.mp4. Reads the journey shape from
// web/src/lib/journey-clip-props.ts (JourneyClipProps). Requires this package's deps to be
// installed first (`npm install` in video/ — this downloads a headless Chromium + ffmpeg).
//
// NOTE: this runs on a real machine / render worker, NOT on Vercel or in Next.js — Remotion's
// bundler cannot run in serverless. For per-user, on-demand in-app clips, use Remotion Lambda
// (renderMediaOnLambda) or a dedicated render service. See README.md.

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
};
const positional = argv.find((a) => !a.startsWith("--") && argv[argv.indexOf(a) - 1]?.startsWith("--") !== true);

const journeyPath = positional || path.join(__dirname, "sample-journey.json");
const codec = flag("codec", "mp4") === "gif" ? "gif" : "h264";
const ext = codec === "gif" ? "gif" : "mp4";
const outLocation = flag("out", path.join(__dirname, "out", `journey-clip.${ext}`));

const inputProps = JSON.parse(fs.readFileSync(journeyPath, "utf8"));
fs.mkdirSync(path.dirname(outLocation), { recursive: true });

console.log(`[video] bundling…`);
const serveUrl = await bundle({ entryPoint: path.join(__dirname, "src/index.ts") });

console.log(`[video] selecting composition…`);
const composition = await selectComposition({ serveUrl, id: "JourneyClip", inputProps });

console.log(`[video] rendering ${codec} -> ${outLocation}`);
await renderMedia({
  composition,
  serveUrl,
  codec,
  outputLocation: outLocation,
  inputProps,
  ...(codec === "gif" ? { everyNthFrame: 2, numberOfGifLoops: 0 } : {}),
});

console.log(`[video] done: ${outLocation}`);
