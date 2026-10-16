# Tasks

## 1. Patterns

- [ ] 1.1 Pattern result type `{ through, engrave[] }` in the rack panel builder and the engraved cut (prism from the front face down to the depth); existing patterns unchanged. Tests: an engraved square of depth d removes `area × d` within 1 %, the panel keeps its outline and stays one component, depth above `thickness − 0.8` is limited with a warning, depth 0 removes nothing.
- [ ] 1.2 `patterns/asanoha.ts`: honeycomb centres, deduplicated lattice edges, centroid-to-corner detail strokes, stroke polygons clipped to the region, main and detail depth sets. Tests: for a known region the number of lattice edges and detail segments matches the formula, no edge is drawn twice, strokes lie inside the region, main only when the detail depth is 0, rotation swaps the axes, a region too small for one hexagon draws nothing without error.
- [ ] 1.3 `patterns/hicks.ts`: nested hexagon rings with alternating bridges, stroke and whitespace widths, clipped to complete cells in the region. Tests: the panel with the pattern is one component for several widths (including the smallest allowed), cut gap width equals the whitespace setting, rings use alternating bridge vertices, thin settings warn.
- [ ] 1.4 Add both kinds to the Pattern section of Panel mode with their fields, defaults, migration and en/ru strings. Component tests: choosing the kind shows its fields only, `expectAllNumericSteppers` passes, key parity, stored panels without the new settings load with defaults.

## 2. Verification

- [ ] 2.1 `npm test` and `npm run build` are green, no console errors; triangle count of a 10 U asanoha and a 10 U Hicks panel is recorded in the task note and generation stays under about 2 s.
- [ ] 2.2 In the browser, en and ru and at 390 px: both patterns on a 2 U panel look like the reference thumbnail (carpet-like nested hexagons; star lattice), rotation works, depth 0 switches stroke sets off, the Hicks panel is a single piece in the exported STL (checked by loading it back or by the model's component count), thin settings show warnings.
