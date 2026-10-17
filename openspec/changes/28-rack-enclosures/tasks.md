# Tasks

## 1. Geometry

- [x] 1.1 `geometry/rack/case.ts`: params, defaults, layout (outer size, units, window, free plate area), `validateRackCase` (`rack.error.tooWide` with the excess, lip limits, openings that do not fit as warnings). Tests: auto units for several device heights (the 120 mm example gives 3 U), forced units, too-wide error carries the excess, window equals device minus twice the lip, a lip over half the size is invalid.
- [x] 1.2 Plate, shell and front window: reuse the panel plate, add the shell prism difference, window. Tests with `expectValidSolid`: bounding box (254 wide, plate height, depth = plate + device depth + gap), volume ≈ plate plus shell walls within 1 %, cavity is open at the back and exactly the device size plus gap, one connected piece.
- [x] 1.3 Keystone openings and cable holes with the free-area fit check, constants in `rack/spec.ts`. Tests: openings lie inside the plate and clear of ears and window, a combination that does not fit is reported and not cut, counts as set, centred.
- [x] 1.4 Vents with the hexagon generator on the top and side walls, limited to the wall thickness. Tests: hole count for a known wall, none near edges or the plate, the device cavity volume is unchanged, thin wall warning, still one piece.
- [x] 1.5 `ModeParams.rackCase`, `generate('rackCase')`, migration, defaults. Test: model result has one part named `case`, parameters round-trip through migration, corrupt data falls back.

## 2. UI

- [ ] 2.1 `CaseMode` with sections Device, Shell, Front, Ears and Vents, persistence under `rack.case`, units shown, Start over, route `/rack/case`, a second card on the Rack chooser with art `rackCase` (`npm run art`, other pictures unchanged), en and ru strings. Component tests: collapsed by default, one highlight per change, steppers on every numeric input, error banner for a too-wide device, key parity, chooser shows two cards with hotkeys 1 and 2. No artboard: built from `ui/` and tokens, said in the commit.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green, no console errors.
- [ ] 3.2 In the browser, en and ru and at 390 px: a 120 × 160 × 40 mm device gives the expected units and a shell open at the back, window with lip, two keystones and a cable hole appear where expected, vents appear on the top and sides, a too-wide device shows the error, STL exports with the expected bounding box.
