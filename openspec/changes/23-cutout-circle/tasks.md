# Tasks

## 1. Geometry

- [ ] 1.1 `CircleSource` and `circleCutout()` in `geometry/cutout.ts`; widen `Cutout['source']`; `baseOutline` (96-point polygon), exact circle case in `cutoutBounds`, `validateCutout` size check; fix every compile error from the wider union. Tests in `cutout.test.ts`: bounds are `±(d/2 + clearance)` and unchanged by rotation 0/30/90, the centring, edge alignment and distribute helpers treat a circle like a rectangle of the same extent, a non-positive diameter is an error.
- [ ] 1.2 Pocket and preview tool for a circle (`pocketSolid`, `buildCutoutTools`): a cylinder of diameter `d + 2·clearance` and the cutout depth. Tests: `expectValidSolid` for a bin with a circle, volume removed ≈ π r² · depth within 0.5 %, bounding box of the tool is the cylinder, a bin with a rectangle, a circle and a mesh builds, a hidden circle changes nothing.

## 2. Panel and view

- [ ] 2.1 `migrateCutout` accepts circles and drops invalid ones; a stored session with rect and mesh cutouts loads unchanged. Test in `features/cutout`.
- [ ] 2.2 `CutoutPanel`: two add buttons (Rectangle, Circle), diameter `LengthField` for a circle, en and ru strings (parity test). Component tests: Add → Circle creates a selected circle named "Circle" with the default diameter, editing the diameter updates the params, `expectAllNumericSteppers` still passes. UI task without an artboard: build from the existing buttons and `ui/` components and say so in the commit.
- [ ] 2.3 `TopView` draws a circle (grown by the clearance); drag, selection and the dashed selection box work. Component test: a circle renders as `<circle>` with radius `d/2 + clearance`, and dragging moves it. Verify in the browser, in en and ru, at 390 px: add a circle, change the diameter, drag, centre, align to an edge.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green, no console errors; in the browser the 3D tool is a cylinder, the model is valid, and exported STL volume matches the expected removal for a 20 mm circle at 10 mm depth.
