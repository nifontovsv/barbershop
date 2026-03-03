import sharp from "sharp";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const inputPath = process.argv[2];
const outputPath = join(root, "public", "logo-no-bg.png");

if (!inputPath) {
  console.error("Usage: node remove-bg-from-asset.mjs <input.png>");
  process.exit(1);
}

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

console.log("Done: public/logo-no-bg.png (transparent background)");
