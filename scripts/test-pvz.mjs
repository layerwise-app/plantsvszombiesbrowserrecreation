import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) { return next(['./data', './animation'].includes(specifier) ? specifier + '.ts' : specifier, context); } });
const { Game } = await import('../src/game/engine.ts');
const { activeRows, PLANTS } = await import('../src/game/data.ts');
const { muzzleOffset, projectileCenter } = await import('../src/game/animation.ts');
let tests = 0;
function test(name, fn) { fn(); tests++; console.log(`PASS ${name}`); }
const game = level => new Game(level, () => {});
const advance = (g, seconds) => { for (let i = 0; i < seconds * 60; i++) g.step(1 / 60); };
const enemy = (g, kind = 'normal', row = 2, x = 400) => { const z = { id: ++g.id, kind, row, x, hp: 270, armor: kind === 'cone' ? 370 : 0, slow: 0, eating: false, dead: 0, jumped: false, bite: 0, jump: 0 }; g.zombies.push(z); return z; };
test('Sun can only be collected once', () => { const g = game(1); g.addSun(100, 100, 100); assert(g.collect(g.suns[0].id)); assert.equal(g.sun, 75); assert(!g.collect(g.suns[0].id)); });
test('Placement spends exact cost, respects lanes, occupancy and cooldown', () => { const g = game(1); g.sun = 500; g.select('pea'); assert(!g.place(0, 0)); assert(g.place(2, 0)); assert.equal(g.sun, 400); assert(!g.select('pea')); advance(g, 7.6); assert(g.select('pea')); assert(!g.place(2, 0)); assert.equal(g.sun, 400); assert(g.place(2, 1)); assert.equal(g.sun, 300); });
test('Insufficient sun cannot select or spend', () => { const g = game(1); assert(!g.select('pea')); assert(!g.place(2, 0)); assert.equal(g.sun, 50); });
test('Shoveling removes a plant without refund', () => { const g = game(2); g.select('sunflower'); g.place(2, 0); g.select('shovel'); assert(g.place(2, 0)); assert.equal(g.plants.length, 0); assert.equal(g.sun, 0); });
test('Sunflower produces 25-sun collectibles', () => { const g = game(2); g.select('sunflower'); g.place(2, 0); advance(g, 7.2); assert(g.suns.some(s => s.x === 98)); });
test('Projectile collision damages armor first and stays in lane', () => { const g = game(3); const z = enemy(g, 'cone', 2, 300); const safe = enemy(g, 'normal', 1, 300); g.shots.push({ id: 55, x: 280, row: 2, ice: false, dead: false }); advance(g, .15); assert.equal(z.armor, 350); assert.equal(z.hp, 270); assert.equal(safe.hp, 270); });
test('Ice peas apply slowing', () => { const g = game(7); const z = enemy(g); g.shots.push({ id: 55, x: 385, row: 2, ice: true, dead: false }); advance(g, .1); assert(z.slow > 9); });
test('Peashooter, Snow Pea and both Repeater peas launch from their animated mouths', () => {
  for (const kind of ['pea', 'snow', 'repeater']) for (let frame = 0; frame < 15; frame++) {
    const g = game(9); g.sun = 500; g.select(kind); g.place(2, 1);
    const p = g.plants[0]; g.time = frame / 12; p.timer = 0; enemy(g, 'normal', 2, 700);
    g.step(1 / 60);
    const shot = g.shots[0]; const muzzle = muzzleOffset(kind, g.time, p.id);
    assert.equal(shot.x, g.px(1) + muzzle.x + 300 / 60);
    assert.equal(shot.y, g.py(2) + muzzle.y);
    assert(shot.y < g.py(2) - 48, 'Shot stays at the mouth, not the plant body');
    const originY = shot.y; g.step(1 / 60); assert.equal(shot.y, originY, 'Flight keeps its launch height');
    assert.equal(projectileCenter(shot, 0).y, originY, 'Renderer uses the stored shot center');
    if (kind === 'repeater') {
      advance(g, .2); assert.equal(g.shots.length, 2);
      assert.equal(g.shots[1].ice, false); assert(g.shots[1].y < g.py(2) - 48);
    }
  }
});
test('Cherry Bomb damages nearby lanes and bypasses armor', () => { const g = game(3); g.sun = 150; g.select('cherry'); g.place(2, 3); const near = enemy(g, 'cone', 1, 320); const far = enemy(g, 'normal', 0, 320); advance(g, 1.3); assert(near.dead > 0); assert.equal(far.hp, 270); assert.equal(g.plants.length, 0); });
test('Potato Mine waits 15 seconds before detonation', () => { const g = game(6); g.select('potato'); g.place(2, 3); const z = enemy(g, 'normal', 2, 440); advance(g, 14); assert.equal(z.hp, 270); z.x = 350; advance(g, 1.5); assert(z.dead > 0); });
test('Chomper consumes a zombie and enters digestion', () => { const g = game(8); g.sun = 150; g.select('chomper'); g.place(2, 3); const z = enemy(g, 'cone', 2, 380); advance(g, .1); assert(z.dead > 0); assert(g.plants[0].digest > 41); });
test('Zombies eat at 100 damage per second', () => { const g = game(3); g.select('wallnut'); g.place(2, 3); enemy(g, 'normal', 2, 330); advance(g, 1.1); assert.equal(g.plants[0].hp, 3900); });
test('Lawnmower is single-use and clears its lane', () => { const g = game(3); const z = enemy(g, 'normal', 2, 20); advance(g, .1); assert(g.mowers[2] > 0); assert(z.dead > 0); advance(g, 3); assert(g.mowers[2] >= 900); const next = enemy(g, 'normal', 2, -34); advance(g, 1); assert.equal(g.status, 'lost'); assert.equal(next.dead, 0); });
test('Victory requires all scheduled zombies eliminated', () => { const g = game(1); g.waves = []; advance(g, .1); assert.equal(g.status, 'won'); });
test('A planted strategy completes all ten consecutive daytime levels', () => {
  for (let level = 1; level <= 10; level++) {
    const g = game(level);
    // Resource-neutral fixture isolates wave/combat completeness from human sun collection.
    for (const row of activeRows(level)) for (let col = 0; col < 5; col++) g.plants.push({ id: ++g.id, kind: 'pea', row, col, hp: 300, age: 0, timer: .7, digest: 0, double: 0 });
    advance(g, 500); assert.equal(g.status, 'won', `Level 1-${level}`);
    assert(PLANTS.some(p => p.unlock <= level));
  }
});
console.log(`${tests} tests passed.`);
