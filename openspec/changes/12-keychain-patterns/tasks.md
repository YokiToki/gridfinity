# Tasks

## 1. Profiles and sources

- [x] 1.1 Profile functions (bevel, dome, terrace, flat, engraved) and the preset table with "Custom" detection. Tests: monotonicity, end slopes, terrace levels count, preset ↔ params round trip.
- [x] 1.2 Brightness height source with contrast/gamma/invert and rim protection; the worker message accepts an optional gray plane. Tests: bright > dark, invert flips, rim height ≥ floor, default output identical to 11 (volume + bbox regression).
- [x] 1.3 Detail lines (spine from the distance ridge, groove from the edge band) ported from `02_heightfield.py`. Tests: spine amplitude bound, groove never below the floor, reference parameters give a volume within tolerance of `keychain_v_form_010.stl`.

## 2. Surface patterns

- [x] 2.1 Pattern fields: lines, crosshatch, dots (square/staggered), hex, ripples as pure `(x, y, params) → coverage` functions. Tests: period, width fraction and rotation on sampled points.
- [x] 2.2 Scope (whole / plateau / base plate) and depth clamp composed into the heightfield; `Δh` never takes height below the floor. Tests: valid solid for extreme depth, bbox unchanged by patterns that only cut, scope isolation.
- [x] 2.3 Params, `validateKeychain` additions (pitch > width, depth ≥ 0, steps ≥ 2) with `keychain.error.*` keys, persistence migrate (old records without patterns get defaults). Tests: migrate and validation tables.
- [x] 2.4 Resolution awareness: `effectiveCell` from 11, warning rule and the raise-resolution action. Test: warning appears below 4 cells and disappears after raising.

## 3. UI

- [ ] 3.1 `ProfileSection` presets + height source controls; component tests for Custom detection and source switch. No artboard: build from `ui/` components.
- [ ] 3.2 `PatternSection` with thumbnail picker, per-pattern controls (`LengthField` for pitch/width/depth), scope control, Reset to plain. Component tests for control sets per pattern.
- [ ] 3.3 en/ru strings (parity test), labels fit at the 380 px panel width, 390 px mobile drawer check.

## 4. Verification

- [ ] 4.1 `npm test` and `npm run build` are green; no console errors in the dev server.
- [ ] 4.2 In the browser: a plain emblem with Lines 45° and Dots, a photo with the brightness source, Terraced and Engraved presets; check bbox and that the exported STL is a valid solid; confirm default settings still reproduce the `11` volume.
