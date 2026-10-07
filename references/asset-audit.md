# Asset Audit

Checked 2026-10-07 with `node scripts/audit-pvz-assets.mjs` against the downloaded repository revisions in `commits.md`.

## Stored Bitmap and Audio Files

- 144 files are byte-identical to their repository source.
- 1,752 re-encoded PNG files have pixel-identical RGBA data to their source.
- 1 opaque PNG uses only the documented edge-connected black-background removal. Color pixels and enclosed black details are preserved.
- 1 logo PNG combines the original logo JPEG with its original alpha mask. No new artwork is painted or generated.
- No AI-generated images, hand-drawn replacement characters, or procedurally generated pea sprites are used.

Peas, scene backgrounds, seed-bank texture, shovel, menu mode buttons, and other files under `public/pvz/original` come from the extracted original macOS game assets. Plant/zombie frame PNGs, sun frames, seed cards, lawnmower, explosion and impact frames, effects, and music under `public/pvz/reference` come from pypvz. These are reference-provided assets, not proof that every frame is an unchanged original 2009 PC extraction.

## Remaining Recreated Presentation

Not everything on screen is an original asset. The welcome sign, almanac book/panel, pause/result panels, generic stone/menu buttons, tutorial labels, seed costs, progress-bar track/fill, and fonts are CSS/HTML approximations. The progress head and flag are source bitmap assets, but the track/fill are not. Lane highlights, ghost-plant opacity, icy tint, death fades, and layout/scaling are code-driven effects, not the original animation engine. Original skeleton animation and all particle effects are not implemented. Menu/panel replacements require a separate fidelity pass; this audit does not claim them as original.

## Projectile Origin Correction

The original 28 x 28 projectile is now centered at the emitting plant's current muzzle rim, using frame-specific coordinates measured from Peashooter, Snow Pea, and Repeater PNGs. Simulation and renderer share the same animation frame selector. Each shot retains its launch height during flight, and impact effects use that height instead of a fixed lower row offset. `scripts/test-pvz.mjs` checks all three shooters over multiple animation phases, including both Repeater shots.

Asset provenance does not grant redistribution permission. See `ASSET_LICENSES.md` before publishing.
