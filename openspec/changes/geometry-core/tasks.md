# Tasks

## 1. Safety net

- [ ] 1.1 Add regression tests recording volume and bounding box for the current baseplate (2×2, with magnets+screws, 1×1); tests pass on current code.

## 2. Kernel extraction

- [ ] 2.1 Create `geometry/spec.ts` and move constants with a pitch override; regression tests still pass.
- [ ] 2.2 Create `geometry/profiles.ts` (`socketPocket`, `binFoot`, `lipProfile` Default/Thin/None); unit tests check heights and widths of each layer via cross-sections.
- [ ] 2.3 Create `geometry/thickness.ts` with defaults, `validate` returning i18n message keys; tests for valid, zero-interior and negative values.
- [ ] 2.4 Create `geometry/sizing.ts` `resolveAxis`; table-driven tests: 100/42, 84/42, 30/42, center/start/end alignment.
- [ ] 2.5 Refactor `buildBaseplate` onto these modules; regression tests unchanged.

## 3. Worker pipeline

- [ ] 3.1 Implement module worker + `useModel` hook (debounce, latest-id wins, loading flag); test the stale-result drop with a fake worker.
- [ ] 3.2 Verify in the browser: dev and `npm run build` + preview both generate a model; UI stays responsive while generating a 10×10 plate.
- [ ] 3.3 Add shared test helper `expectValidSolid` (status, positive volume, expected bbox) and use it in all geometry tests.

## 4. Fractional sizing UI hooks

- [ ] 4.1 Add `SizeInput` (units ↔ mm sync, per-axis alignment select) in `ui/`; component test: 2.5 units ↔ 105 mm, 100 mm → ~2.38 units.
- [ ] 4.2 Document the geometry package conventions in `CLAUDE.md`.
