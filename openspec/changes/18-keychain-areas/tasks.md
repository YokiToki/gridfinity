# Tasks

## 1. Geometry

- [x] 1.1 `SilhouetteParams.areas` and migration from `keepOpen` (`migrateKeychain`); `buildSilhouette` fills `follow`/`level` areas, keeps `open`, returns the filled-area label plane. Tests: open area stays background, ids stable under unrelated settings, migration table, vanished-id warning data.
- [x] 1.2 Heightfield: label plane resampled to the grid; `level` areas get a flat top (≥ heightFloor) and skip detail lines and patterns. Tests: two areas with different levels have exactly those tops, hard step at the border, pattern and spine absent inside, regression volumes equal to change 11 when no area is levelled, valid solid.
- [x] 1.3 `validateKeychain`: level numeric ≥ 0; `keychain.warning.areaGone`. Table test.

## 2. UI

- [x] 2.1 Rename hole → area in the panel, preview and warnings (en/ru, "Область"); `SilhouetteSection` area list with mode select, level field (with steppers), selected row, "Apply to all". Component tests: mode change updates params, level field only for Level, apply to all. No artboard: build from `ui/` components.
- [x] 2.2 `MaskPreview` (small and enlarged): label plane, click hit test, selected-area outline, numbers only. Component tests for hit testing and selection both ways.
- [x] 2.3 Persistence migrate tests; i18n parity; check labels at 380 px and in Russian.

## 3. Verification

- [x] 3.1 `npm test` and `npm run build` are green; no console errors.
- [x] 3.2 In the browser with `v_form.jpeg` (12 areas): open two areas, give three areas different levels, enlarge the mask and select by click, export STL and check heights of the levelled areas in the file; confirm the default still reproduces the volume of change 11.
