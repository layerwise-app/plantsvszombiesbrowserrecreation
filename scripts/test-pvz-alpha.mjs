import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { preserveSpriteAlpha } from './pvz-alpha.mjs';
const require = createRequire(import.meta.url);
const sharp = require('../node_modules/.pnpm/sharp@0.35.4_@types+node@26.6.2/node_modules/sharp');

const transparentSprite = Buffer.from([0, 0, 0, 0, 0, 0, 0, 255, 40, 20, 10, 128]);
const original = Buffer.from(transparentSprite);
preserveSpriteAlpha(transparentSprite, 3, 1);
assert.deepEqual(transparentSprite, original, 'Existing alpha, black pupils, and semi-transparent edges must remain intact');

const opaqueSprite = Buffer.alloc(5 * 5 * 4);
for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
  const i = (y * 5 + x) * 4;
  const ring = x >= 1 && x <= 3 && y >= 1 && y <= 3 && (x !== 2 || y !== 2);
  opaqueSprite.set(ring ? [180, 100, 30, 255] : [0, 0, 0, 255], i);
}
preserveSpriteAlpha(opaqueSprite, 5, 5);
assert.equal(opaqueSprite[3], 0, 'Opaque black background becomes transparent');
assert.equal(opaqueSprite[(2 * 5 + 2) * 4 + 3], 255, 'Enclosed black eyes remain opaque');

for (let frame = 0; frame < 18; frame++) {
  const { data } = await sharp(`public/pvz/reference/graphics/Plants/SunFlower/SunFlower_${frame}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaqueBlack = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 12 && data[i + 1] < 12 && data[i + 2] < 12 && data[i + 3] === 255) opaqueBlack++;
  }
  assert(opaqueBlack > 0, `Sunflower frame ${frame} must retain opaque black facial details`);
}
console.log('PASS existing alpha preserved, opaque backdrop removed, enclosed black details preserved, all 18 Sunflower frames retain black details');
