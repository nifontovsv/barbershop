import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const inputPath = join(root, "public", "logo.png");
const outputPath = join(root, "public", "logo-no-bg.png");

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const threshold = 72;

for (let i = 0; i < data.length; i += channels) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luminance < threshold) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: { width, height, channels },
})
  .png()
  .toFile(outputPath);

console.log("Done: new logo saved to public/logo-no-bg.png (transparent background)");
