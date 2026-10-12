# Tasks

## 1. Shapes and geometry

- [ ] 1.1 `geometry/shapes.ts`: analytic inside tests and the 2048 px mask for rectangle, circle, ellipse, capsule, polygon (corner rounding, rotation); effective radius helper. Tests: areas against analytic values, symmetry, radius clamp, polygon vertex count/width.
- [ ] 1.2 `KeychainParams.origin` and the shape path in `buildKeychainParts` (skips silhouette thresholding, exact size fit); `validateKeychain` for shape sizes. Tests: bounding boxes (54 × 30, 40 mm circle) within 0.05 mm, valid solids, mounts and two halves on a shape.
- [ ] 1.3 Rim in `buildGrid` (`RimParams` in `ShapeParams`, shapes only, before patterns, engraved ring); image keychains unaffected (regression volumes). Tests: rim height and width on a rectangle, off = identical volume, pattern never below the floor, valid solid; migration (old records get origin image, rim off).

## 2. UI

- [ ] 2.1 `KeychainMode` empty state with two choices and `OriginSection` (segmented control at the top of the panel); the mask preview and editor work for shapes. Component tests: first open shows both choices, Shape generates without an image, switching keeps both sides' settings. No artboard: build from the start-card style and `ui/` components.
- [ ] 2.2 `ShapeSection` (kind thumbnails, sizes with `LengthField`, corner radius with the effective value, sides, presets) and `RimSection` inside it (hidden for the image origin). Component tests per kind control set and rim visibility.
- [ ] 2.3 en/ru strings (parity), persistence under `keychain.relief` with migration, session text; labels at 380 px and in Russian.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green; no console errors.
- [ ] 3.2 In the browser: a 54 × 30 rounded rectangle tag with rim, a 40 mm round tag, a hexagon; add a through hole and the two-halves mode with pins; export STL and check the bounding boxes in the file.
