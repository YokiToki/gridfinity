# Tasks

## 1. Patterns

- [x] 1.1 *(replaced: the engraved cut was dropped, asanoha is cut through.)* Pattern placement and region helpers stay through-only; asanoha and Hicks return a `CrossSection` like the other patterns.
- [x] 1.2 `patterns/asanoha.ts`: lattice nodes, deduplicated lattice edges, centroid-to-corner detail strokes, stroke polygons, openings between the strokes cut through (only whole openings inside the region). Tests: lattice edge and detail counts follow the formula, no edge twice, nodes on the lattice, wider strokes cut less, detail strokes split the openings, rotation stays in the region, a region too small draws nothing, the panel is one piece for several widths (including 0.8 and detail 0).
- [x] 1.3 `patterns/hicks.ts`: nested hexagon rings with alternating bridges, stroke and whitespace widths, complete cells plus optional edge cells clipped to the region. Tests: the panel is one component for several widths (including the smallest allowed) with and without edge cells and rotation, cut gap width equals the whitespace setting, rings use alternating bridge vertices, edge cells reach the region border without leaving it, thin settings warn.
- [x] 1.4 Add both kinds to the Pattern section of Panel mode with their fields (edge cells toggle for Hicks), defaults, migration and en/ru strings. Component tests: choosing the kind shows its fields only, `expectAllNumericSteppers` passes, key parity, stored panels without the new settings load with defaults.

## 2. Verification

- [x] 2.1 `npm test` and `npm run build` are green, no console errors; triangle count of a 10 U asanoha and a 10 U Hicks panel is recorded in the task note and generation stays under about 2 s. Recorded: 10 U asanoha 0.16 s and 39 356 triangles, 10 U Hicks (edge cells on) 0.37 s and 84 332 triangles (Node, one run).
- [x] 2.2 In the browser, en and ru and at 390 px: both patterns on a 2 U panel look like the reference thumbnail (carpet-like nested hexagons; star lattice), rotation works, detail width 0 switches the detail strokes off, the Hicks edge cells option fills the border, the Hicks panel is a single piece in the exported STL (checked by loading it back or by the model's component count), thin settings show warnings.
