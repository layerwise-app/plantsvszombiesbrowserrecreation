import sprites from './sprites.json';
import { Game, GRID } from './engine';
import { activeRows, plantInfo, ZOMBIES, type PlantKind } from './data';
import { animationFrame, plantAnimationTime, projectileCenter } from './animation';

const cache = new Map<string, HTMLImageElement>();
const frameSets = sprites as Record<string, string[]>;
export function image(url: string) {
  let img = cache.get(url);
  if (!img) { img = new Image(); img.src = url; cache.set(url, img); }
  return img;
}
function draw(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, w?: number, h?: number) {
  const img = image(url);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, x, y, w ?? img.naturalWidth, h ?? img.naturalHeight);
}
function sprite(ctx: CanvasRenderingContext2D, key: string, time: number, x: number, bottom: number, scale = 1) {
  const frames = frameSets[key]; if (!frames?.length) return;
  const img = image(frames[animationFrame(time, frames.length)]);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, x - img.naturalWidth * scale / 2, bottom - img.naturalHeight * scale, img.naturalWidth * scale, img.naturalHeight * scale);
}
export function preload() {
  const keys = ['Plants/Peashooter', 'Plants/SunFlower', 'Plants/CherryBomb', 'Plants/WallNut', 'Plants/PotatoMine', 'Plants/SnowPea', 'Plants/Chomper', 'Plants/RepeaterPea', 'Plants/Sun', 'Zombies/NormalZombie', 'Zombies/ConeheadZombie', 'Zombies/BucketheadZombie', 'Zombies/PoleVaultingZombie', 'Zombies/FlagZombie'];
  for (const [key, frames] of Object.entries(frameSets)) if (keys.some(k => key.startsWith(k))) frames.forEach(image);
  ['/pvz/original/background1.jpg', '/pvz/original/background1unsodded.jpg', '/pvz/reference/graphics/Screen/car.png', '/pvz/reference/graphics/Screen/Boom.png', '/pvz/original/ProjectilePea.png', '/pvz/original/ProjectileSnowPea.png'].forEach(image);
}
export function render(ctx: CanvasRenderingContext2D, game: Game, hover: { row: number; col: number } | null) {
  ctx.clearRect(0, 0, 800, 600);
  const rows = activeRows(game.level);
  draw(ctx, `/pvz/original/${rows.length < 5 ? 'background1unsodded' : 'background1'}.jpg`, -220, 0);
  if (rows.length < 5) {
    const lawn = image('/pvz/original/background1.jpg');
    if (lawn.complete && lawn.naturalWidth) for (const row of rows) {
      ctx.drawImage(lawn, GRID.x + 220, GRID.y + row * GRID.height, 720, GRID.height, GRID.x, GRID.y + row * GRID.height, 720, GRID.height);
    }
  }
  if (hover && game.selected && rows.includes(hover.row)) {
    ctx.fillStyle = game.selected === 'shovel' ? '#ff7c6444' : '#f3ffcc35';
    ctx.fillRect(GRID.x + hover.col * 80, GRID.y + hover.row * 98, 80, 98);
  }
  for (const row of rows) if (game.mowers[row] < 900) draw(ctx, '/pvz/reference/graphics/Screen/car.png', game.mowers[row] - 9, game.py(row) - 37, 56, 51);
  for (let row = 0; row < 5; row++) {
    for (const p of game.plants.filter(p => p.row === row)) {
      let key = plantInfo(p.kind).sprite;
      if (p.kind === 'wallnut') key = `Plants/WallNut/${p.hp < 1333 ? 'WallNut_cracked2' : p.hp < 2666 ? 'WallNut_cracked1' : 'WallNut'}`;
      if (p.kind === 'potato' && p.age < 15) key = 'Plants/PotatoMine/PotatoMineInit';
      if (p.kind === 'chomper' && p.digest > 0) key = 'Plants/Chomper/ChomperDigest';
      sprite(ctx, key, plantAnimationTime(game.time, p.id), game.px(p.col), game.py(row));
    }
    for (const z of game.zombies.filter(z => z.row === row).sort((a, b) => b.x - a.x)) {
      let def = ZOMBIES[z.kind];
      if ((z.kind === 'cone' || z.kind === 'bucket') && z.armor <= 0) def = ZOMBIES.normal;
      const animation = z.dead ? def.die : z.kind === 'pole' && z.jump > 0 ? 'PoleVaultingZombieJump' : z.kind === 'pole' && z.jumped && !z.eating ? 'PoleVaultingZombieWalkAfterJump' : z.eating ? def.attack : def.walk;
      const folder = z.dead && z.kind !== 'pole' ? 'NormalZombie' : def.sprite;
      ctx.save(); if (z.slow > 0) ctx.filter = 'sepia(.6) hue-rotate(150deg) saturate(1.8)';
      if (z.dead) ctx.globalAlpha = Math.max(0, 1 - z.dead / 1.4);
      sprite(ctx, `Zombies/${folder}/${animation}`, z.dead || game.time * (z.slow > 0 ? .5 : 1) + z.id, z.x + (z.kind === 'pole' ? 10 : 4), game.py(row) + 10);
      ctx.restore();
    }
  }
  // Original 28px textures, centered on the shot without stretching their padding.
  for (const s of game.shots) {
    const center = projectileCenter(s, game.py(s.row) - 55);
    draw(ctx, `/pvz/original/${s.ice ? 'ProjectileSnowPea' : 'ProjectilePea'}.png`, center.x - 14, center.y - 14);
  }
  for (const e of game.effects) {
    ctx.save(); ctx.globalAlpha = 1 - e.age / (e.kind === 'boom' ? .8 : .3);
    if (e.kind === 'boom') draw(ctx, '/pvz/reference/graphics/Screen/Boom.png', e.x - 85, game.py(e.row) - 120, 170, 130);
    else if (e.kind === 'hit') sprite(ctx, 'Bullets/PeaNormalExplode', e.age, e.x, (e.y ?? game.py(e.row) - 55) + 14);
    ctx.restore();
  }
  if (hover && game.selected && game.selected !== 'shovel') {
    ctx.save(); ctx.globalAlpha = .5; sprite(ctx, plantInfo(game.selected as PlantKind).sprite, game.time, game.px(hover.col), game.py(hover.row)); ctx.restore();
  }
  for (const s of game.suns) { ctx.save(); if (s.age > 14 && !s.collected) ctx.globalAlpha = .6 + Math.sin(game.time * 12) * .3; sprite(ctx, 'Plants/Sun', game.time, s.x, s.y + 28, .78); ctx.restore(); }
}
