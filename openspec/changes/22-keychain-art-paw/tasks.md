# Tasks

## 1. Paw shape

- [x] 1.1 Add `src/geometry/art/paw.ts`: `pawField` (smooth union of a palm pad and four toes as signed distances) and `pawBitmap(size)` returning an anti-aliased `GrayImage`. Test `paw.test.ts`: one connected region, mirror-symmetric, four toe gaps present at a mid-toe row, bbox inside the bitmap, deterministic output.
- [x] 1.2 Use it in `scripts/render-art.ts` instead of `badgeBitmap` (drop the star `areas` override, keep the eyelet above the paw). Verify: `npm run art` runs and the new `keychainImage.svg` shows a paw with the eyelet between the two middle toes.

## 2. Smooth edges

- [ ] 2.1 Raise the keychain group's resolution in the script (cell about 0.12–0.15 mm, bitmap about 1000 px, larger `maxTriangles`); measure with the SVG: outline step lengths before/after, file size, `npm run art` time. Verify: the stairs on the paw outline and bevel edges are no longer visible at 200 % zoom in the browser.
- [ ] 2.2 Add the opt-in `smooth` option to `ArtOptions` (Béziers through segment midpoints, sharp corners kept above a turn-angle threshold) in `trace.ts`/`svg.ts`, enabled only for the Keychain group in the script. Tests: `trace.test.ts` for the smooth path (closed, within a tolerance of the polyline, a right-angle corner stays sharp) and `svg.test.ts` that the default output is unchanged.
- [ ] 2.3 Tune tolerance and tone count so the SVG stays within 60 KB. Verify: `ModeArt.test.tsx` budget passes; `box.svg`, `baseplate.svg`, `cutout.svg` are unchanged in `git diff`.

## 3. Cards and docs

- [ ] 3.1 Regenerate and commit `keychainImage.svg` (and `keychainShape.svg` if the group scale changed); check that the Keychain card on `/` is as tall as the Gridfinity card and the Image card on `/keychain` looks right, in en and ru, at 390 px, with the console free of errors.
- [ ] 3.2 Update `CLAUDE.md` (Start page art: paw instead of the disc with a star, smooth option, new `BOX_ART_HEIGHT` note if it changed) and add the change to `openspec/ROADMAP.md` (table row and gantt) with "Depends on: 11, 14, 21".

## 4. Verification

- [ ] 4.1 `npm test` and `npm run build` are green, the dev server starts without console errors, and the start page opens with no worker, WASM or WebGL activity.
