import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const originals = {
  ProjectilePea: 'c7dc1eedf6cf573458ab35de1694db07fc11dba898a02413c6875c8246f5129e',
  ProjectileSnowPea: '28254c98c09ab626388f370a944eb151a14168da9073f7c57612ce785a660f1b',
};
for (const [name, hash] of Object.entries(originals)) {
  const asset = readFileSync(`public/pvz/original/${name}.png`);
  assert.equal(createHash('sha256').update(asset).digest('hex'), hash, `${name} must remain an unmodified original asset`);
  assert.equal(asset.readUInt32BE(16), 28);
  assert.equal(asset.readUInt32BE(20), 28);
}
console.log('PASS original pea and snow-pea assets are byte-identical to the source and retain their native 28 x 28 dimensions');
