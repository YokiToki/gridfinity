# Tasks

## 1. Text mask and geometry

- [x] 1.0 `fontList.ts` (≈ 24 families with latin + cyrillic, groups, weights), on-demand dynamic loaders and the install of the fontsource packages; test that every entry has a loader and both subsets, and that loading is lazy (nothing imported until chosen). Report the dist size growth.
- [x] 1.1 `fonts.ts` and `textRaster.ts`: font loading (`document.fonts.load`), user font via `FontFace`, text → alpha mask at 12 px/mm with spacing/alignment/lines, mask bounds in mm. Tests with a mocked canvas (call arguments, sizing, multiline layout) and a pure measuring helper.
- [x] 1.2 Worker message `{kind: 'text'}` + registry; `TextParams` in `KeychainParams`, validation and migration. Tests for the client message and the migrate table.
- [ ] 1.3 Heightfield: sample the mask by inverse transform, emboss/engrave rules, plate-in-grid when the text lies on the plate, clipping warning, text only on the top half. Tests on a synthetic mask: emboss height, engrave depth and clamp, rotation and position, plate case, two-halves case, valid solids.
- [ ] 1.4 Resolution warning for fine strokes (reuse `patternResolution`). Test.

## 2. UI

- [ ] 2.1 `TextSection`: enable, content (textarea), font select (grouped list of bundled families, generic, user), load-font button with error banner, size/spacing/alignment/rotation, emboss/engrave with height/depth (`LengthField` with steppers). Component tests. No artboard: build from `ui/` components.
- [ ] 2.2 `PlacementEditor` text target: draw the text box and baseline to scale, drag, numeric X/Y; component tests.
- [ ] 2.3 en/ru strings (parity), IndexedDB storage of the user font, restore on reload; check labels at 380 px and in Russian.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green; no console errors.
- [ ] 3.2 In the browser, offline after first use: a round tag with embossed "ANNA" and "Анна" in a Sans, a Serif, a Display and a Handwriting family, an engraved second line, text moved on the plate outside the silhouette, an own font loaded and restored after reload; export STL and check heights in the file; confirm the top half only carries the text in two-halves mode.
