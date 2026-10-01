/**
 * Regenerates the raster icons from the Evidence Dossier mark (src/app/icon.svg).
 *
 *   cd web && pnpm exec tsx scripts/generate-icons.ts
 *
 * Writes public/icons/icon-192.png, icon-512.png, icon-maskable-512.png (web manifest) and
 * src/app/favicon.ico (16/32/48 PNG-in-ICO). Renders with Playwright's Chromium, already a
 * devDependency, so no image library is added. Colors come from src/lib/og-palette.ts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { PALETTE } from "../src/lib/og-palette";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { desk, redline } = PALETTE;

// Same geometry as src/app/icon.svg (32x32 viewBox, 5px corner radius).
const mark = (opts: { size: number; rounded: boolean; inset: number }): string => `
<!doctype html><meta charset="utf-8">
<body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="${opts.size}" height="${opts.size}" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="${opts.rounded ? 5 : 0}" fill="${desk}"/>
  <g transform="translate(${opts.inset} ${opts.inset}) scale(${(32 - opts.inset * 2) / 32})">
    <rect x="5" y="5" width="22" height="22" rx="2" stroke="${redline}" stroke-width="2.6"/>
    <path d="M10 16.5l4 4 8-9" stroke="${redline}" stroke-width="3" stroke-linecap="square"/>
  </g>
</svg>`;

// Maskable icons are cropped by the OS to a circle or squircle: keep the mark inside the
// central 80% safe zone by insetting it and filling the whole canvas.
const SPECS = [
  { file: join(root, "public/icons/icon-192.png"), size: 192, rounded: true, inset: 0 },
  { file: join(root, "public/icons/icon-512.png"), size: 512, rounded: true, inset: 0 },
  { file: join(root, "public/icons/icon-maskable-512.png"), size: 512, rounded: false, inset: 5 },
];
const ICO_SIZES = [16, 32, 48];

function ico(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0);
    e.writeUInt8(size, 1);
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main(): Promise<void> {
  mkdirSync(join(root, "public/icons"), { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const render = async (size: number, rounded: boolean, inset: number): Promise<Buffer> => {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(mark({ size, rounded, inset }));
      return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    };
    for (const spec of SPECS) {
      writeFileSync(spec.file, await render(spec.size, spec.rounded, spec.inset));
      console.log("wrote", spec.file);
    }
    const images = [];
    for (const size of ICO_SIZES) images.push({ size, png: await render(size, true, 0) });
    writeFileSync(join(root, "src/app/favicon.ico"), ico(images));
    console.log("wrote", join(root, "src/app/favicon.ico"));
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
