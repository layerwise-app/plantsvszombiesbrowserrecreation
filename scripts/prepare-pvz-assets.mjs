import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { preserveSpriteAlpha } from './pvz-alpha.mjs';
const require = createRequire(import.meta.url);
const sharp = require('../node_modules/.pnpm/sharp@0.35.4_@types+node@26.6.2/node_modules/sharp');

// Use pristine source frames to recover any alpha lost by an earlier conversion.
const root = 'public/pvz/reference/graphics';
const sourceRoot = process.argv[2] ?? root;
const manifest = {};
async function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.png$/i.test(file)) {
      const relative = path.relative(sourceRoot, file);
      const output = path.join(root, relative);
      const key = path.dirname(relative).replaceAll('\\', '/');
      if (/_(\d+)\.png$/.test(entry.name)) {
        (manifest[key] ??= []).push('/pvz/reference/graphics/' + relative.replaceAll('\\', '/'));
        const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        preserveSpriteAlpha(data, info.width, info.height);
        fs.mkdirSync(path.dirname(output), { recursive: true });
        await sharp(data, { raw: info }).png().toFile(output + '.converted.png');
        fs.renameSync(output + '.converted.png', output);
      }
    }
  }
}
await walk(sourceRoot);
for (const frames of Object.values(manifest)) frames.sort((a, b) => Number(a.match(/_(\d+)\.png$/)[1]) - Number(b.match(/_(\d+)\.png$/)[1]));
fs.writeFileSync('src/game/sprites.json', JSON.stringify(manifest));
const color = await sharp('public/pvz/original/PvZ_Logo.jpg').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const mask = await sharp('public/pvz/original/PvZ_Logo_.png').resize(color.info.width, color.info.height).raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < color.info.width * color.info.height; i++) color.data[i * 4 + 3] = mask.data[i * mask.info.channels];
await sharp(color.data, { raw: color.info }).png().toFile('public/pvz/original/logo.png');
