# Tasks

## 1. Raster toolkit

- [ ] 1.1 `geometry/raster/` grayscale/alpha → mask: `otsu`, `threshold` (+invert). Tests: bimodal synthetic image gives the expected split; alpha mask wins when alpha is present.
- [ ] 1.2 Morphology (`close`, `dilate`, `erode`, speck removal). Tests on small masks: a 1 px gap closes, a speck of N px is removed, a thin tip survives a small dilate.
- [ ] 1.3 Connected components and holes with stable ids; `keepOpen` handling. Tests: ring has one hole, id stability when a non-hole setting changes, kept-open hole stays background.
- [ ] 1.4 Exact Euclidean distance transform. Test: matches a brute-force implementation on random small masks.

## 2. Relief geometry

- [ ] 2.1 Height profile and `KeychainParams` with `validateKeychain` (i18n keys `keychain.error.*`: empty mask, `heightFloor ≥ hmax`, plate too small). Test: table of valid/invalid combinations.
- [ ] 2.2 Grid heightfield → watertight `Manifold` with triangle budget and effective cell size. Tests (`expectValidSolid`): disc silhouette volume vs analytic estimate within 5 %, bbox height = hmax + base, bottom at z = 0, budget respected.
- [ ] 2.3 Scaling by longest side / box. Tests: 70 mm and 40 mm bbox, heights unchanged, aspect ratio preserved.
- [ ] 2.4 Base plate shapes (follow silhouette offset, rect, rounded rect, circle, none). Tests: bbox of each shape, single solid, too-small plate is rejected, volume regression for the reference settings (`hmax 2`, `base 2`).
- [ ] 2.5 Add `keychain` to `ModeParams`/`generate()` and the worker message type (mask + params in, `MeshData` out, transferables). Test: `generate('keychain', …)` in Node and the stale-request behaviour of `modelClient`.

## 3. Image in the browser

- [ ] 3.1 Decode helpers (`createImageBitmap`, SVG via `<img>`), 4096 px cap, grayscale + alpha extraction. Component/unit tests with a tiny generated PNG and a bad file.
- [ ] 3.2 IndexedDB image store with in-memory fallback and a warning flag. Test: round trip and fallback.
- [ ] 3.3 `useKeychainModel` glue: params + stored image → worker → `MeshData`, `pending`/`busy` like `useModel`, empty-mask handling that keeps the last mesh. Test with a mocked client.

## 4. UI

- [ ] 4.1 `KeychainMode` replaces the placeholder; `ImageSection` (picker, drop zone, replace, errors). Component test: drop of a valid and an invalid file. No artboard: build from `ui/` components.
- [ ] 4.2 `SilhouetteSection` + `MaskPreview` (threshold, invert, close, fill, specks, grow, hole ids with keep-open toggles). Component tests: slider updates params, hole toggle updates `keepOpen`.
- [ ] 4.3 `SizeSection` (`LengthField` for sizes), `ReliefSection`, `BaseSection` with shape picker and plate size/margin/radius. Component tests incl. inch display and validation message.
- [ ] 4.4 Export block (STL, size, volume), persistence under `keychain.relief` with `usePersistedState` and a migrate stub. en/ru strings for every new key (parity test).
- [ ] 4.5 Compare with the component library in the browser, en and ru, desktop and 390 px; fix clipped labels.

## 5. Verification

- [ ] 5.1 `npm test` and `npm run build` are green; the dev server starts with no console errors.
- [ ] 5.2 In the browser: import the `v_form.jpeg` and `o_form.jpeg` references from `~/sandbox/openscad-agent/work/`, use the reference parameters (70 mm, hmax 2, edge 6, pow 0.65, base 2), check the bounding box and compare the volume with `keychain_v_form_010.stl` within a documented tolerance; export STL and open it in a slicer.
