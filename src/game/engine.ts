import { activeRows, plantInfo, schedule, ZOMBIES, type PlantKind, type ZombieKind } from './data';
import { muzzleOffset } from './animation';

export const GRID = { x: 40, y: 85, width: 80, height: 98 };
export type Plant = { id: number; kind: PlantKind; row: number; col: number; hp: number; age: number; timer: number; digest: number; double: number };
export type Zombie = { id: number; kind: ZombieKind; row: number; x: number; hp: number; armor: number; slow: number; eating: boolean; dead: number; jumped: boolean; bite: number; jump: number };
export type Sun = { id: number; x: number; y: number; target: number; age: number; collected: boolean; value: number };
export type Shot = { id: number; x: number; y?: number; row: number; ice: boolean; dead: boolean };
export type Effect = { x: number; y?: number; row: number; age: number; kind: 'boom' | 'hit' | 'dirt' };
export class Game {
  level: number;
  time = 0;
  sun = 50;
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  suns: Sun[] = [];
  shots: Shot[] = [];
  effects: Effect[] = [];
  cooldown: Partial<Record<PlantKind, number>> = {};
  mowers = [0, 0, 0, 0, 0];
  selected: PlantKind | 'shovel' | null = null;
  status: 'playing' | 'won' | 'lost' = 'playing';
  message = '';
  messageUntil = 0;
  spawned = 0;
  skyTimer = 5;
  id = 0;
  waves: ReturnType<typeof schedule>;
  sound: (name: string) => void;
  constructor(level: number, sound: (name: string) => void) { this.level = level; this.waves = schedule(level); this.sound = sound; }
  announce(message: string, duration = 4) { this.message = message; this.messageUntil = this.time + duration; }
  addSun(x: number, y: number, target: number) { this.suns.push({ id: ++this.id, x, y, target, age: 0, collected: false, value: 25 }); }
  collect(id: number) {
    const sun = this.suns.find(s => s.id === id && !s.collected);
    if (!sun || this.status !== 'playing') return false;
    sun.collected = true; this.sun += sun.value; this.sound('collectSun'); return true;
  }
  select(kind: PlantKind | 'shovel') {
    if (kind !== 'shovel' && (this.sun < plantInfo(kind).cost || (this.cooldown[kind] ?? 0) > 0)) { this.sound('cannotChooseWarning'); return false; }
    this.selected = this.selected === kind ? null : kind; this.sound(kind === 'shovel' ? 'shovel' : 'clickCard'); return true;
  }
  place(row: number, col: number) {
    if (this.status !== 'playing' || !activeRows(this.level).includes(row) || col < 0 || col > 8) return false;
    const existing = this.plants.find(p => p.row === row && p.col === col);
    if (this.selected === 'shovel') {
      if (!existing) return false;
      this.plants = this.plants.filter(p => p !== existing); this.sound('shovel'); this.selected = null; return true;
    }
    if (!this.selected || existing) return false;
    const def = plantInfo(this.selected);
    if (this.sun < def.cost || (this.cooldown[def.id] ?? 0) > 0) return false;
    this.sun -= def.cost; this.cooldown[def.id] = def.cooldown;
    this.plants.push({ id: ++this.id, kind: def.id, row, col, hp: def.hp, age: 0, timer: def.id === 'sunflower' ? 7 : .7, digest: 0, double: 0 });
    this.effects.push({ x: this.px(col), row, age: 0, kind: 'dirt' }); this.sound('plant'); this.selected = null; return true;
  }
  px(col: number) { return GRID.x + col * GRID.width + 40; }
  py(row: number) { return GRID.y + row * GRID.height + 76; }
  damage(z: Zombie, amount: number, ash = false) {
    if (z.dead) return;
    if (!ash && z.armor > 0) { const absorbed = Math.min(z.armor, amount); z.armor -= absorbed; amount -= absorbed; }
    z.hp -= amount;
    if (z.hp <= 0) { z.dead = .001; z.eating = false; this.sound('plantDie'); }
  }
  explode(p: Plant, radius: number) {
    for (const z of this.zombies) if (Math.abs(z.row - p.row) <= (radius > 60 ? 1 : 0) && Math.abs(z.x - this.px(p.col)) < radius) this.damage(z, 1800, true);
    p.hp = 0; this.effects.push({ x: this.px(p.col), row: p.row, age: 0, kind: 'boom' }); this.sound(p.kind === 'potato' ? 'potatomine' : 'bomb');
  }
  step(dt: number) {
    if (this.status !== 'playing') return;
    this.time += dt;
    for (const k of Object.keys(this.cooldown) as PlantKind[]) this.cooldown[k] = Math.max(0, this.cooldown[k]! - dt);
    this.skyTimer -= dt;
    if (this.skyTimer <= 0) { this.addSun(90 + Math.random() * 620, -35, 130 + Math.random() * 370); this.skyTimer = Math.min(9.5, 4.25 + this.time / 50); }
    while (this.spawned < this.waves.length && this.time >= this.waves[this.spawned].at) {
      const wave = this.waves[this.spawned++]; const def = ZOMBIES[wave.kind];
      this.zombies.push({ id: ++this.id, kind: wave.kind, row: wave.row, x: 800, hp: def.hp, armor: def.armor, slow: 0, eating: false, dead: 0, jumped: false, bite: 0, jump: 0 });
      if (this.spawned === 1) { this.announce('The zombies are coming!', 3); this.sound('zombieComing'); }
      if (wave.flag) { this.announce('A HUGE WAVE OF ZOMBIES IS APPROACHING!', 5); this.sound('hugeWaveApproching'); }
      if (this.spawned === this.waves.length) this.announce('FINAL WAVE', 3);
    }
    for (const s of this.suns) {
      s.age += dt;
      if (s.collected) { s.x += (47 - s.x) * Math.min(1, dt * 8); s.y += (40 - s.y) * Math.min(1, dt * 8); }
      else s.y = Math.min(s.target, s.y + dt * 35);
    }
    this.suns = this.suns.filter(s => s.collected ? Math.abs(s.y - 40) > 3 : s.age < 18);
    for (const p of this.plants) {
      p.age += dt; p.timer -= dt; p.digest = Math.max(0, p.digest - dt);
      const enemies = this.zombies.filter(z => !z.dead && z.row === p.row && z.x > this.px(p.col) - 25 && z.x < 805);
      if (p.kind === 'sunflower' && p.timer <= 0) { this.addSun(this.px(p.col) + 18, this.py(p.row) - 55, this.py(p.row) - 8); p.timer = 24; }
      if (p.kind === 'cherry' && p.age >= 1.2) this.explode(p, 120);
      if (p.kind === 'potato' && p.age >= 15 && enemies.some(z => Math.abs(z.x - this.px(p.col)) < 36)) this.explode(p, 60);
      if (p.kind === 'chomper' && p.digest === 0) {
        const victim = enemies.find(z => z.x < this.px(p.col) + 100);
        if (victim) { this.damage(victim, 10000, true); p.digest = 42; this.sound('bigchomp'); }
      }
      if (['pea', 'snow', 'repeater'].includes(p.kind)) {
        const shoot = () => {
          const muzzle = muzzleOffset(p.kind, this.time, p.id);
          this.shots.push({ id: ++this.id, row: p.row, x: this.px(p.col) + muzzle.x, y: this.py(p.row) + muzzle.y, ice: p.kind === 'snow', dead: false });
          this.sound('shoot');
        };
        if (p.double > 0) { p.double -= dt; if (p.double <= 0) shoot(); }
        if (p.timer <= 0 && enemies.length) { shoot(); p.timer = 1.4; if (p.kind === 'repeater') p.double = .15; }
      }
    }
    for (const shot of this.shots) {
      const oldX = shot.x; shot.x += dt * 300;
      const victim = this.zombies.filter(z => !z.dead && z.row === shot.row && z.x >= oldX - 12 && z.x <= shot.x + 16).sort((a, b) => a.x - b.x)[0];
      if (victim) { this.damage(victim, 20); if (shot.ice) victim.slow = 10; shot.dead = true; this.effects.push({ x: shot.x, y: shot.y, row: shot.row, age: 0, kind: 'hit' }); this.sound('bulletExplode'); }
    }
    this.shots = this.shots.filter(s => !s.dead && s.x < 850);
    for (const z of this.zombies) {
      if (z.dead) { z.dead += dt; continue; }
      z.slow = Math.max(0, z.slow - dt); z.jump = Math.max(0, z.jump - dt);
      const p = this.plants.filter(p => p.hp > 0 && p.row === z.row && z.x >= this.px(p.col) - 22 && z.x < this.px(p.col) + 35).sort((a, b) => b.col - a.col)[0];
      if (p && z.kind === 'pole' && !z.jumped) { z.jumped = true; z.jump = .8; z.x -= 90; this.sound('polevaultjump'); }
      else if (p) { z.eating = true; z.bite += dt * (z.slow > 0 ? .5 : 1); if (z.bite >= .5) { p.hp -= 50; z.bite -= .5; this.sound('zombieAttack'); } }
      else { z.eating = false; z.x -= ZOMBIES[z.kind].speed * (z.kind === 'pole' && z.jumped ? .5 : 1) * (z.slow > 0 ? .5 : 1) * dt; }
      if (z.x < 25 && this.mowers[z.row] === 0) { this.mowers[z.row] = 1; this.sound('carWalking'); }
      if (z.x < -35) { this.status = 'lost'; this.sound('lose'); }
    }
    for (let row = 0; row < 5; row++) if (this.mowers[row] > 0 && this.mowers[row] < 900) {
      this.mowers[row] += dt * 450;
      for (const z of this.zombies) if (z.row === row && z.x < this.mowers[row] + 30) this.damage(z, 10000, true);
    }
    this.plants = this.plants.filter(p => p.hp > 0);
    this.zombies = this.zombies.filter(z => !z.dead || z.dead < 1.4);
    for (const e of this.effects) e.age += dt;
    this.effects = this.effects.filter(e => e.age < (e.kind === 'boom' ? .8 : .3));
    if (this.spawned === this.waves.length && this.zombies.length === 0 && this.status === 'playing') { this.status = 'won'; this.sound('win'); }
  }
}
