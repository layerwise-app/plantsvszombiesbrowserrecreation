export type PlantKind = 'pea' | 'sunflower' | 'cherry' | 'wallnut' | 'potato' | 'snow' | 'chomper' | 'repeater';
export type ZombieKind = 'normal' | 'cone' | 'bucket' | 'pole' | 'flag';
export const PLANTS: { id: PlantKind; name: string; cost: number; cooldown: number; hp: number; sprite: string; card: string; unlock: number; description: string }[] = [
  { id: 'pea', name: 'Peashooter', cost: 100, cooldown: 7.5, hp: 300, sprite: 'Plants/Peashooter', card: 'peashooter', unlock: 1, description: 'Shoots peas at approaching zombies.' },
  { id: 'sunflower', name: 'Sunflower', cost: 50, cooldown: 7.5, hp: 300, sprite: 'Plants/SunFlower', card: 'sunflower', unlock: 2, description: 'Gives you additional sun. Plant plenty!' },
  { id: 'cherry', name: 'Cherry Bomb', cost: 150, cooldown: 50, hp: 300, sprite: 'Plants/CherryBomb', card: 'cherrybomb', unlock: 3, description: 'Blows up all zombies in a nearby area.' },
  { id: 'wallnut', name: 'Wall-nut', cost: 50, cooldown: 30, hp: 4000, sprite: 'Plants/WallNut/WallNut', card: 'wallnut', unlock: 4, description: 'Blocks zombies and protects your other plants.' },
  { id: 'potato', name: 'Potato Mine', cost: 25, cooldown: 30, hp: 300, sprite: 'Plants/PotatoMine/PotatoMine', card: 'potatomine', unlock: 6, description: 'Explodes on contact. Takes 15 seconds to arm.' },
  { id: 'snow', name: 'Snow Pea', cost: 175, cooldown: 7.5, hp: 300, sprite: 'Plants/SnowPea', card: 'snowpea', unlock: 7, description: 'Frozen peas damage and slow down zombies.' },
  { id: 'chomper', name: 'Chomper', cost: 150, cooldown: 7.5, hp: 300, sprite: 'Plants/Chomper/Chomper', card: 'chomper', unlock: 8, description: 'Swallows a zombie whole, then needs time to chew.' },
  { id: 'repeater', name: 'Repeater', cost: 200, cooldown: 7.5, hp: 300, sprite: 'Plants/RepeaterPea', card: 'repeaterpea', unlock: 9, description: 'Fires two peas at a time.' },
];
export const plantInfo = (id: PlantKind) => PLANTS.find(p => p.id === id)!;
export const ZOMBIES: Record<ZombieKind, { name: string; sprite: string; walk: string; attack: string; die: string; armor: number; hp: number; speed: number }> = {
  normal: { name: 'Zombie', sprite: 'NormalZombie', walk: 'Zombie', attack: 'ZombieAttack', die: 'ZombieDie', armor: 0, hp: 270, speed: 4.8 },
  cone: { name: 'Conehead Zombie', sprite: 'ConeheadZombie', walk: 'ConeheadZombie', attack: 'ConeheadZombieAttack', die: 'ZombieDie', armor: 370, hp: 270, speed: 4.8 },
  bucket: { name: 'Buckethead Zombie', sprite: 'BucketheadZombie', walk: 'BucketheadZombie', attack: 'BucketheadZombieAttack', die: 'ZombieDie', armor: 1100, hp: 270, speed: 4.8 },
  pole: { name: 'Pole Vaulting Zombie', sprite: 'PoleVaultingZombie', walk: 'PoleVaultingZombie', attack: 'PoleVaultingZombieAttack', die: 'PoleVaultingZombieDie', armor: 0, hp: 500, speed: 9.6 },
  flag: { name: 'Flag Zombie', sprite: 'FlagZombie', walk: 'FlagZombie', attack: 'FlagZombieAttack', die: 'ZombieDie', armor: 0, hp: 270, speed: 6.4 },
};
export function activeRows(level: number) { return level === 1 ? [2] : level === 2 ? [1, 2, 3] : [0, 1, 2, 3, 4]; }
export type Spawn = { at: number; row: number; kind: ZombieKind; flag?: boolean };
// Explicit recreation schedules, NOT the original PC wave scripts. See GAME_NOTES.md.
export function schedule(level: number): Spawn[] {
  const rows = activeRows(level);
  const count = level === 1 ? 6 : level === 2 ? 10 : 12 + level * 3;
  return Array.from({ length: count }, (_, i) => ({
    at: (level === 1 ? 18 : 28) + i * (level < 3 ? 13 : Math.max(3.8, 9 - level * .45)),
    row: rows[(i * 3 + Math.floor(i / rows.length)) % rows.length],
    kind: i === count - 5 ? 'flag' : level >= 8 && i % 7 === 5 ? 'bucket' : level >= 6 && i % 8 === 4 ? 'pole' : level >= 3 && i % 4 === 3 ? 'cone' : 'normal',
    flag: i === count - 5,
  }));
}
