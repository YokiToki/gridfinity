# Tasks

## 1. Anchors and checks

- [x] 1.1 `geometry/anchors.ts`: footprint min-filter, ranked candidates with rejection reasons, relative coordinate helpers. Tests on synthetic masks: disc gives centre-ring candidates, a thin tip is rejected with the right reason, results are stable when scaled.
- [x] 1.2 Exterior vs interior-cavity classification (reuse background labelling from 11) and the channel breach check. Tests: exit in open air passes, exit in a closed cavity fails, narrow notch with coarse grid warns.
- [x] 1.3 Fit-check module returning `{feature, kind, actual, required}`; tests for thin wall, outside plate, pin too big.

## 2. Mount geometry

- [x] 2.1 Through hole and mount params (relative position, diameter, presets); `Manifold` cut after patterns. Tests: hole volume removed ≈ π r² t, bbox unchanged, validity.
- [x] 2.2 Eyelet lug via `CrossSection` hull + union with the plate. Tests: single solid, bbox grows toward the edge, hole through, lug overlaps the plate.
- [x] 2.3 Symmetric build + `splitByPlane`, bottom half rotated 180° about X. Tests: two valid solids, volume sum within 0.5 % of the symmetric solid, both have bottom at z = 0.
- [x] 2.4 Alignment pin holes and loose pins; auto-placement through the anchors module. Tests: matching positions in both halves, pin radius = hole − clearance, rejected positions reported.
- [x] 2.5 Embedded channel across the mating plane with breach verification. Test: the exported halves, when stacked, leave a channel open to the exterior.
- [x] 2.6 Print sheet layout and `generate('keychain', …)` returns sheet / top / bottom; test: no overlap between parts, rotation not mirror (signed volume stays positive).

## 3. UI

- [ ] 3.1 `PlacementEditor` (SVG contour, mm grid, rulers, drag, numeric entry, snap to outline); unit conversion in the display only. Component tests for drag and numeric entry. No artboard: build from `ui/` components and `theme.css` tokens.
- [ ] 3.2 `MountSection` (style, diameters, presets, Suggest with candidate/rejected overlay, warnings). Component tests: channel disabled without split, Suggest places the mount.
- [ ] 3.3 `SplitSection` (toggle, pins count/radius/clearance/depth) and export block Sheet/Top/Bottom with sheet size. Component tests; persistence and migrate for old records.
- [ ] 3.4 en/ru strings (parity test); compare with the component library, 390 px drawer, long Russian labels.

## 4. Verification

- [ ] 4.1 `npm test` and `npm run build` are green; no console errors.
- [ ] 4.2 In the browser: take the `v_form` reference, place the ring channel at the reference entrance scaled to the chosen size, 3 pins, export the sheet; check halves in a slicer view for no overhangs, pins fit the holes, channel opens to the edge. Repeat with a through hole and an eyelet, and with a pattern from `12` if archived.
