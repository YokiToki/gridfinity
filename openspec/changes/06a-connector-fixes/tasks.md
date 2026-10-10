# Tasks

## 1. Geometry

- [ ] 1.1 Dovetail on the bed: key from z = 0 up to `dovetailHeight` (default 2), socket from below the part to `dovetailHeight + clearance`; update the fit check to sample z from 0; tests: key min z is 0 and its height is the setting, socket is open at the bottom and 0.2 mm above the key, bounding boxes of key and socket, with and without ears and a floor.
- [ ] 1.2 Filament-sized presets (filament 1.9, pin 2.1, pin 3.1, M3, magnet), filament as the default, and rib-end positions: candidates at the cell boundaries inside the face, nominal positions snapped to them, no duplicates, `connector.noRib` for a face without candidates; tests: 2×2 and 4-row faces, count and inset, single-row face, same positions in both parts.
- [ ] 1.3 Holes along the rib: the cylinder axis runs along the cut normal at the rib's axis, depth = min(configured, part extent − 2 mm), fastener collision on the new positions, fit check for the diameter; tests: default holes are blind and keep 0.4 mm from both sockets along their whole length, the volume removed per hole equals the cylinder, the genus of the part does not change (no connection to a pocket), M3 fits, the magnet is reported.

## 2. UI

- [ ] 2.1 `ConnectorsSection`: key height field, new preset list and default, effective depth shown under the depth field (en/ru); component tests for the preset values, the clamped depth note and the dovetail fields. Design: `design/artboards/BaseplateSplit.dc.html`.
- [ ] 2.2 Migration check: stored settings without `dovetailHeight` get 2 mm and keep their other values; test.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` pass; in the browser with a 300×200 mm plate on a 256 mm bed: the dovetail key sits on the bed in the preview, holes are small, the effective depth is shown, no console errors.
