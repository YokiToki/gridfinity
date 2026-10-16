# Tasks

## 1. Paw shape

- [x] 1.1 Add `src/geometry/art/paw.ts`: `pawField` (smooth union of a palm pad and four toes as signed distances) and `pawBitmap(size)` returning an anti-aliased `GrayImage`. Test `paw.test.ts`: one connected region, mirror-symmetric, four toe gaps present at a mid-toe row, bbox inside the bitmap, deterministic output.
- [x] 1.2 Use it in `scripts/render-art.ts` instead of `badgeBitmap` (drop the star `areas` override, keep the eyelet above the paw). Verify: `npm run art` runs and the new `keychainImage.svg` shows a paw with the eyelet between the two middle toes.

## 2. Smooth edges

- [x] 2.1 Raise the keychain group's resolution in the script (cell 0.12 mm, `maxTriangles` 2 000 000); measured against the old render: file 54 KB → 52 KB, `npm run art` about 4 s longer, the stairs of the paw outline are gone at 5× zoom in the browser (tone edges and wall bottoms still stepped).
- [x] 2.2 Add the opt-in `smooth` option to `ArtOptions` (`smoothMask` in `geometry/art/smooth.ts`: Gaussian blur of every tone and silhouette mask and a 0.5 threshold, σ in viewBox units), enabled only for the Keychain group in the script (`KEYCHAIN_SMOOTH`). Tests: `smooth.test.ts` (a stair edge becomes straight, a one-pixel spike disappears, a large region keeps its area within 1 %, σ = 0 returns the mask) and `svg.test.ts` (default output unchanged, `smooth` changes it, deterministic).
- [x] 2.3 Tune σ so the edges are smooth at 5× zoom and the SVG stays within 60 KB (σ = 0.9). Verify: `ModeArt.test.tsx` budget passes; `box.svg`, `baseplate.svg`, `cutout.svg` are unchanged in `git diff`.

## 3. Cards and docs

- [x] 3.1 Regenerate and commit `keychainImage.svg` (and `keychainShape.svg` if the group scale changed); check that the Keychain card on `/` is as tall as the Gridfinity card and the Image card on `/keychain` looks right, in en and ru, at 390 px, with the console free of errors.
- [x] 3.2 Update `CLAUDE.md` (Start page art: paw instead of the disc with a star, smooth option, new `BOX_ART_HEIGHT` note if it changed) and add the change to `openspec/ROADMAP.md` (table row; the gantt has not tracked changes since 15, so it is left alone) with "Depends on: 11, 14, 21".

## 4. Verification

- [x] 4.1 `npm test` and `npm run build` are green, the dev server starts without console errors, and the start page opens with no worker, WASM or WebGL activity.
