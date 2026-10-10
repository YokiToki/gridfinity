# Tasks

## 1. Geometry

- [ ] 1.1 Dovetail on the bed: key from z = 0 up to `dovetailHeight` (default 2), socket from below the part to `dovetailHeight + clearance`; update the fit check to sample z from 0; tests: key min z is 0 and its height is the setting, socket is open at the bottom and 0.2 mm above the key, bounding boxes of key and socket, with and without ears and a floor.
- [ ] 1.2 Filament-sized blind holes: add the presets (filament 1.9, pin 2.1, pin 3.1, M3, magnet), make filament the default, add `holeDepthLimit` and carry the effective depth in the plan; tests: default holes stay 0.4 mm away from both sockets (sample the part's wall around the hole), depth is clamped, M3 still fits, the magnet is reported as not fitting.
- [ ] 1.3 Verify blindness on real parts: for a split plate with filament holes, the volume removed per hole equals a cylinder of the effective depth and the hole does not connect to a pocket (no change of the part's genus); test it.

## 2. UI

- [ ] 2.1 `ConnectorsSection`: key height field, new preset list and default, effective depth shown under the depth field (en/ru); component tests for the preset values, the clamped depth note and the dovetail fields. Design: `design/artboards/BaseplateSplit.dc.html`.
- [ ] 2.2 Migration check: stored settings without `dovetailHeight` get 2 mm and keep their other values; test.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` pass; in the browser with a 300×200 mm plate on a 256 mm bed: the dovetail key sits on the bed in the preview, holes are small, the effective depth is shown, no console errors.
