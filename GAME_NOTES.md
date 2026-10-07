# Recreation Status

This is an independently written TypeScript/Canvas fan recreation, not the original PC engine and not a complete reproduction of the 2009 game.

## Implemented

- Main menu, seed selection, early lane tutorials, ten consecutive daytime battles, victory/defeat, retry, plant rewards, next-level flow, and a plant almanac.
- 800 x 600 playfield with proportional viewport scaling; mouse, touch, keyboard seed shortcuts, pause, restart, audio settings, fullscreen, and locally saved highest unlocked level.
- Frame-based plant/zombie idle, walking, eating, cracked Wall-nut, mine arming, digestion, jump, and death animations. Locally stored original-reference backgrounds, seed bank, shovel, seed packets, projectiles, sun, and effects.
- Collectible 25-value sun, falling sun, sunflower generation, per-plant recharge, placement validation, shoveling, same-lane projectiles, armor absorption, ice slowing, cherry and mine explosions, chomping, pole vaulting, one-use lawnmowers, final waves, and end conditions.
- Local original-reference effects and music; browser autoplay rules may delay audio until interaction.

## Mechanics Provenance

Consulted `wszqkzqk/pypvz/source/constants.py` and `source/component/plant.py` as a secondary implementation reference. No reference engine source is copied.

| Mechanic | Value implemented | Reference |
| --- | --- | --- |
| Seed costs | 100, 50, 150, 50, 25, 175, 150, 200 | `PLANT_CARD_INFO` |
| Recharge | 7.5 s; Wall-nut/mine 30 s; Cherry 50 s | `PLANT_CARD_INFO` |
| Plant / Wall-nut health | 300 / 4000 | `PLANT_HEALTH`, `WALLNUT_HEALTH` |
| Pea damage / firing interval | 20 / 1.4 s | `BULLET_DAMAGE_NORMAL`, plant attack routines |
| Sun / sunflower interval | 25 / 24 s | `SUN_VALUE`, `FLOWER_SUN_INTERVAL` |
| Zombie eating | 50 each 0.5 s | `ZOMBIE_ATTACK_DAMAGE`, `ATTACK_INTERVAL` |
| Cone / bucket armor | 370 / 1100 | `CONEHEAD_HEALTH`, `BUCKETHEAD_HEALTH` |
| Zombie health | 270 total (200 body + 70 head-loss allowance) | `NORMAL_HEALTH`, `LOSTHEAD_HEALTH` |
| Pole health | 500 total (333 + 167) | `POLE_VAULTING_HEALTH`, `POLE_VAULTING_LOSTHEAD_HEALTH` |
| Mine arming | 15 s | PotatoMine initialization |

Secondary references are not authoritative proof of original PC values. Movement speed, sun expiry, initial sunflower delay, ice duration, explosion delay, and animation timing are approximations. Chomper digestion uses a 42-second original-style target rather than pypvz's 15-second implementation. Peashooter is initial; Sunflower, Cherry Bomb, Wall-nut, Potato Mine, Snow Pea, Chomper, and Repeater follow the daytime unlock sequence, with the shovel reward at 1-4 and bowling interlude acknowledged but not reproduced.

## Not Yet Recreated

- Original wave schedules and exact adaptive original-game pacing. All ten levels use explicit replacement schedules in `src/game/data.ts`; these are not claimed as original scripts.
- Original 1-5 Wall-nut Bowling and 1-10 conveyor finale. Those levels currently use standard seed-bank battles.
- Night, pool, fog, roof, final boss, later plants/zombies, minigames, puzzles, survival, shop, Zen Garden, coins, achievements, and original Crazy Dave dialog.
- Original skeletal reanimation blending, detached armor/head pieces, exact death variants, original particle system, and all sound/announcement variations.
- Full accessibility for the visual playfield, mid-battle save/resume, and cross-device synchronization.
- Pixel-perfect original menu geometry and original bitmap fonts; the surrounding browser shell is intentionally separate from the classic game surface.

## Verification

`node scripts/test-pvz.mjs` exercises spending, placement, cooldown, shoveling, sun production/collection, collisions, armor, slowing, explosions, mine arming, chomping, eating, lawnmowers, loss, victory, and combat completion across levels 1-1 through 1-10. The campaign fixture provides a preplanted defense and does not certify original pacing or balance. Live preview tests cover menu, selection, sun collection, placement, pause, and local-progress reload. Type and production checks: `pnpm run check-types`, `pnpm run build`.
