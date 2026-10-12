# Tasks

## 1. Structure

- [x] 1.1 Registry and routes: `keychain.modes` (image, shape), mode label keys per product, generalised `ModeChooser`/header switcher/mobile select, `lastSession` mode as a string, `/keychain` chooser, `/keychain/image`, `/keychain/shape`, unknown path back to the chooser. Tests: registry paths, routes (direct links, unknown paths), header switcher per product, Continue chip, chooser hotkeys 1/2, legacy `#/keychain` shows the chooser. UI task: no artboard for the Keychain chooser; reuse the Gridfinity chooser cards (`Main.dc.html` card style) and say so.
- [x] 1.2 Split `KeychainMode` into `KeychainWorkspace` (shared) + `ImageMode` (image store, decoding, drop zone, image-only sections) + `ShapeMode`; the panel composes shared sections from a list; Image mode behaviour and persisted key `keychain.relief` unchanged. Tests: all existing Keychain mode/panel tests still pass; Shape mode renders without image sections.

## 2. Shapes and geometry

- [x] 2.1 `geometry/shapes.ts`: analytic inside tests and the 2048 px mask for rectangle, circle, ellipse, capsule, polygon (rounding, rotation); effective radius helper. Tests: areas against analytic values, symmetry, radius clamp, polygon width and vertex count.
- [ ] 2.2 `KeychainParams.origin` and the shape path in `buildKeychainParts` (bypasses thresholding, areas and brightness; exact size fit; editor preview still produced); `validateKeychain` for shape sizes. Tests: bounding boxes (54 × 30, 40 mm circle) within 0.05 mm, valid solids, mount and two halves on a shape, Image mode regression volumes unchanged.
- [ ] 2.3 Rim in `buildGrid` (`ShapeParams.rim`, before patterns, engraved ring). Tests: rim height and width on a rectangle, off = identical volume, pattern never below the floor, valid solid.

## 3. UI

- [ ] 3.1 `ShapeSection` (kind thumbnails, sizes with `LengthField`, corner radius with effective value, sides/rotation, presets) and `RimSection`; Shape mode defaults. Component tests per kind control set and rim fields. No artboard: build from `ui/` components.
- [ ] 3.2 `PlacementEditor` outline for shapes and hiding the mask card; Shape mode state under `keychain.shape` with its own migrate. Component and persistence tests.
- [ ] 3.3 en/ru strings (parity: `keychain.modes.*`, shape strings), labels at 380 px and in Russian, 390 px drawer.

## 4. Verification

- [ ] 4.1 `npm test` and `npm run build` are green; no console errors.
- [ ] 4.2 In the browser: chooser, header switching between modes with settings kept per mode, a 54 × 30 rounded tag with rim, a 40 mm round tag, a hexagon; add a through hole and two halves with pins in Shape mode; export STL and check the bounding boxes in the file; confirm Image mode still reproduces the volume of change 11.
