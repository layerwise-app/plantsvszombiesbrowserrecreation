import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { preserveSpriteAlpha } from './pvz-alpha.mjs';
const require = createRequire(import.meta.url);
const sharp = require('../node_modules/.pnpm/sharp@0.35.4_@types+node@26.6.2/node_modules/sharp');
const reference = process.argv[2] ?? '/private/tmp/pypvz-reference/resources';
const original = process.argv[3] ?? '/private/tmp/pvz-assets-reference';
const counts = { byteIdentical: 0, pixelIdentical: 0, alphaOnly: 0, derivedLogo: 0 };

async function compare(local, source) {
  const output = fs.readFileSync(local);
  const input = fs.readFileSync(source);
  if (output.equals(input)) { counts.byteIdentical++; return; }
  assert(/\.png$/i.test(local), `Unexpected modified asset: ${local}`);
  const actual = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const expected = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(actual.info.width, expected.info.width, local);
  assert.equal(actual.info.height, expected.info.height, local);
  if (actual.data.equals(expected.data)) { counts.pixelIdentical++; return; }
  preserveSpriteAlpha(expected.data, expected.info.width, expected.info.height);
  assert(actual.data.equals(expected.data), `Unexpected changed pixels: ${local}`);
  counts.alphaOnly++;
}

for (const relative of fs.readdirSync('public/pvz/reference', { recursive: true })) {
  const local = path.join('public/pvz/reference', relative);
  if (fs.statSync(local).isFile()) await compare(local, path.join(reference, relative));
}
for (const relative of fs.readdirSync('public/pvz/original')) {
  const local = path.join('public/pvz/original', relative);
  if (relative === 'logo.png') { counts.derivedLogo++; continue; }
  const images = path.join(original, 'images', relative);
  await compare(local, fs.existsSync(images) ? images : path.join(original, 'reanim', relative));
}

const color = await sharp('public/pvz/original/PvZ_Logo.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const mask = await sharp('public/pvz/original/PvZ_Logo_.png').resize(color.info.width, color.info.height).raw().toBuffer({ resolveWithObject: true });
for (let pixel = 0; pixel < color.info.width * color.info.height; pixel++) color.data[pixel * 4 + 3] = mask.data[pixel * mask.info.channels];
const logo = await sharp('public/pvz/original/logo.png').ensureAlpha().raw().toBuffer();
assert(logo.equals(color.data), 'Logo must only combine the original image and original alpha mask');
console.log('PASS every stored game bitmap/audio asset matches its local reference source or documented transparency conversion');
console.log(JSON.stringify(counts, null, 2));
