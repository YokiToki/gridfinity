# Tasks

## 1. Rack geometry

- [x] 1.1 `geometry/rack/spec.ts` with the 10-inch constants and a `rackLayout(u, tolerance)` helper (panel height, ear-hole centres for every unit, window and region). Tests pin every number: 254, 44.45, 236.525, 222.25, offsets 6.35 / 22.225 / 38.1, a 1 U panel has three holes per ear 15.875 apart, a 3 U panel has nine.
- [x] 1.2 `geometry/rack/panel.ts`: panel body with corner radius, thickness, tolerance and ear holes (round or slot, positions all / outer / none); `RackPanelParams`, defaults, `validateRackPanel` (keys `rack.error.*`, warnings `rack.warning.*`). Tests with `expectValidSolid`: bbox 254 × (n × 44.45 − tolerance) × thickness for 1, 2 and 10 U, hole centres on the standard grid, hole count per option, volume equals plate minus holes within 0.5 %, tolerance off gives exactly n × 44.45.
- [x] 1.3 `geometry/rack/patterns/{region,skadis,hex}.ts`: pattern region, centred layout, rotation by 90°, Skadis (5 × 15, pitch 40, step 20, shifted rows) and hexagon patterns as `CrossSection`s clipped to complete elements. Tests: Skadis element count and positions for a known region, every element lies inside the region, rotation swaps the axes, hexagon walls equal the setting, the panel stays one component.
- [x] 1.4 `patterns/{pills,lines,passthrough}.ts` and wiring of all five patterns into the panel with the minimum-width warnings and the one-piece check. Tests: pills (with and without edge pills), lines, pass-through with extra thickness, thin-wall warning for a wall below 0.8 mm, disconnected result rejected.
- [x] 1.5 Back wall part and model plumbing: `ModeParams.rackPanel`, `generate('rackPanel')` returning `panel` and optional `back` parts. Tests: two parts when on, same outline and holes, back thickness as set, behind the panel (z below 0), one part when off, export of the parts as separate objects in 3MF keeps both.

## 2. Product and UI

- [x] 2.1 Product section: `rack` in `products.ts` and `modes.tsx`, routes `/rack` and `/rack/panel`, mode chooser, header switcher, `lastSession` accepts `rack`, en and ru strings for the product (names stay untranslated brand names). Tests: registry paths unique and prefixed, router test for `/rack`, `/rack/panel` and an unknown subpath, the product switcher lists three products, `lastSession` old and new records.
- [x] 2.2 `features/rack/` (`RackPanelMode`, `migrate`, sections Size, Ears, Pattern, Back wall) with `Workspace`, persistence under `rack.panel`, section summaries and changed highlights, Start over. Component tests: collapsed by default, one highlight per change, every numeric input has steppers (`expectAllNumericSteppers`), pattern kind switches the visible fields, corrupt storage falls back to defaults, key parity en/ru. No artboard: built from `ui/` and tokens, said in the commit.
- [x] 2.3 Start page: third product card with art `rackPanel` (add to `scripts/render-art.ts`, `ART`, `ModeArt` budget test), three-column layout and key 3, equal-height cards at the three widths. Run `npm run art` and check the other pictures are unchanged in `git diff`. Test: three cards, hotkeys 1–3, art size under 60 KB.

## 3. Verification

- [x] 3.1 `npm test` and `npm run build` are green, the dev server starts, the console has no errors.
- [x] 3.2 In the browser, en and ru, desktop and 390 px: root → Rack Master → Panel; set 2 U with Skadis, then hex, pills, lines and pass-through; slot and round ear holes at the standard positions; the back wall shows as a second part; a 1 U STL has the expected bounding box (254 × 44.0 × thickness) and exports; the Rack card is level with the others on the start page.
