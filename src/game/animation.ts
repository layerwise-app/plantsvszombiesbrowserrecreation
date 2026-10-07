import type { Plant, Shot } from './engine';

export function plantAnimationTime(time: number, id: number) { return time + id * .27; }
export function animationFrame(time: number, count: number) { return Math.floor(time * 12) % count; }

// Muzzle rim bounds measured in the shipped frame PNGs, not the plant's cell center.
const MUZZLES = {
  pea: { width: 71, height: 71, points: [[64, 13.5], [65, 14], [67, 16.5], [68, 19], [66, 16.5], [64, 14], [62, 13], [61, 13.5], [60, 16.5], [60, 19.5], [60, 21], [60, 14], [61, 13.5]] },
  snow: { width: 71, height: 71, points: [[68, 16.5], [70, 18.5], [70, 20], [66, 15], [65, 14.5], [63, 14.5], [63, 14.5], [62, 18], [62, 20.5], [62, 20.5], [62, 17.5], [63, 15], [63, 14.5], [65, 14.5], [67, 15]] },
  repeater: { width: 73, height: 71, points: [[71, 17.5], [71, 18.5], [71, 19], [68, 14.5], [66, 13.5], [65, 13], [64, 13.5], [63, 15.5], [63, 20], [63, 21.5], [64, 14], [64, 13.5], [65, 13], [67, 13.5], [69, 14.5]] },
};

export function muzzleOffset(kind: Plant['kind'], time: number, id: number) {
  const key = kind as keyof typeof MUZZLES;
  const muzzle = MUZZLES[key];
  const [x, y] = muzzle.points[animationFrame(plantAnimationTime(time, id), muzzle.points.length)];
  return { x: x - muzzle.width / 2, y: y - muzzle.height };
}

export function projectileCenter(shot: Shot, fallbackY: number) {
  return { x: shot.x, y: shot.y ?? fallbackY };
}
