# Tasks

## 1. Geometry

- [ ] 1.1 `geometry/rack/tray.ts`: params, defaults, layout (window width, cells, padding, headroom in mm and height units), `validateRackTray` (`rack.error.shelfTooHigh`, depth limits). Tests: five cells and 12.25 mm padding at pitch 42 with zero clearance, six cells at pitch 35, headroom for a 2 U plate with base height 4.65 is about 84 mm and 12 units, shelf above the plate rejected.
- [ ] 1.2 Assembly: the baseplate via `buildBaseplate`, the rack plate rotated to stand at the front edge, union with the 0.01 mm overlap. Tests with `expectValidSolid`: one connected solid, bounding box (254 wide, plate height tall, depth plate + shelf), the shelf pockets are still the Baseplate mode's (cell count and pocket depth equal a standalone baseplate of the same parameters), ear holes on the standard grid, volume equals plate plus baseplate within 1 %.
- [ ] 1.3 `ModeParams.rackTray`, `generate('rackTray')` returning one part `tray`, migration normalising nested objects (including fasteners). Tests: parameters round-trip, partial stored data gets defaults, corrupt data falls back.

## 2. UI

- [ ] 2.1 `TrayMode` with sections Plate, Shelf (with the headroom line), Floor and Fasteners (existing sections reused), persistence under `rack.tray`, Start over, route `/rack/tray`, third card on the Rack chooser with art `rackTray` (`npm run art`, other pictures unchanged), en and ru strings. Component tests: collapsed by default, one highlight per change, steppers on every numeric input, error banner for a shelf above the plate, key parity, three cards with hotkeys 1–3. No artboard: built from existing components and tokens, said in the commit.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green, no console errors.
- [ ] 3.2 In the browser, en and ru and at 390 px: a 2 U tray with a 4-unit depth shows a plate with ears and a five-cell baseplate behind it, the headroom line matches the arithmetic, the pockets look like the Baseplate mode's, fasteners add magnet holes as there, the model is one part and the STL exports in print orientation.
