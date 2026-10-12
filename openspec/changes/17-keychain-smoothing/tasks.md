# Tasks

## 1. Filters and geometry

- [x] 1.1 `geometry/raster/blur.ts`: masked separable Gaussian (σ from mm, clamps) and 3 × 3 median over material neighbours, with a "fixed" mask that is skipped and not averaged in. Tests: constant stays constant, impulse becomes a Gaussian, no leakage across the mask, median removes isolated pixels, radius/cost clamps.
- [ ] 1.2 Source smoothing in `buildGrid` (blur and despeckle before contrast/gamma); `SourceParams.smooth/despeckle`, migration (old = 0 / false, new brightness choice = 0.4). Tests: noisy gradient gets smoother (variance drop), silhouette identical, zero = identical volume to before.
- [ ] 1.3 Surface smoothing (`ReliefParams.smooth`) before detail lines, patterns and later features; floor and rim clamps. Tests: terraced profile gets slopes of about the radius width, rim ≥ floor, plate thickness unchanged, pattern edges unchanged, regression volumes with smoothing 0, valid solid.
- [ ] 1.4 `validateKeychain` ranges and the "no effect below one cell" rule with the raise-resolution data (`patternResolution` generalised). Table test.

## 2. UI

- [ ] 2.1 `ProfileSection`: Smoothing + Remove speckles for the brightness source, Smooth surface for all; warning with the raise-resolution button. Component tests for control visibility, values and the warning. No artboard: build from `ui/` components.
- [ ] 2.2 en/ru strings (parity); check labels at 380 px and in Russian.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green; no console errors.
- [ ] 3.2 In the browser: a JPEG photo with the brightness source, smoothing 0 vs 0.4 mm vs 1 mm (visible grain removal, outline unchanged); a terraced emblem with surface smoothing; export STL and compare the height profile along a line in the file; confirm default keychains keep the volume of change 11.
