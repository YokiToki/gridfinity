# Tasks

## 1. Photo geometry

- [x] 1.1 `geometry/photo/{paper,homography}.ts`: paper presets (Letter, A4, custom clamp), convex-quad check, `homography(quad → rect)`, `warpGray` to a straightened raster at 4 px/mm (longest side ≤ 2000 px). Tests: the four corners map exactly to the rectangle's corners, a synthetic photo (a known rectangle drawn on a canvas-like array and seen through a known homography) is straightened to an upright rectangle within 1 px, a bowtie quad is rejected, orientation is not mirrored (asymmetric test shape).
- [x] 1.2 `geometry/photo/segment.ts`: edge-margin mask, quadratic background fit with seed mask and refit, ratio image, default sensitivity from Otsu, cleanup (`close`, `removeSpecks`, `fillHoles`), components with area and bbox in mm. Tests on synthetic rasters: a lighting gradient across the paper gives no false object, a large dark object (30 % of the sheet) is still detected as one, sensitivity changes the result monotonically, specks and edge-margin content are ignored, an enclosed gap is filled, two separate objects give two silhouettes.
- [x] 1.3 `geometry/photo/outline.ts`: silhouette mask → polygon in mm (sub-pixel trace, longest outer loop, simplify 0.15 mm, counter-clockwise, y up, relative to the bbox centre) plus its centre in paper coordinates. Tests: a 40 × 20 mm rectangle and a 30 mm disc come out within 0.5 mm of their size, area within 2 %, polygon is simple and counter-clockwise, point count stays below 400 for a smooth shape.

## 2. Traced outline source

- [x] 2.1 `OutlineSource` in `geometry/cutout.ts`: union, `baseOutline`, `cutoutBounds` through the rotated polygon, `validateCutout`, `outlineCutout()` factory, migration (`migrateCutout` accepts `kind: 'outline'`, drops invalid ones). Tests: bounds of a rotated outline equal the rotated polygon's box plus the clearance, centring and edge alignment helpers work with it, invalid outlines are dropped on load, a stored session with all four kinds round-trips.
- [x] 2.2 Pocket and 3D tool for an outline (`pocketSolid`, `buildCutoutTools`) and `fitFootprintUnits` in `cutout-placement.ts`. Tests: `expectValidSolid`, removed volume = polygon area (grown by the clearance) × depth within 1 %, tool bounding box equals the polygon box, `fitFootprintUnits` returns the smallest whole units holding the cutouts with wall and margin (100 × 55 mm need → 3 × 2 at pitch 42) and re-centres them.
- [x] 2.3 UI for the source: `TopView` draws the polygon, `CutoutPanel` shows the size (read-only, the shape has no width fields), en and ru strings (parity). Component tests: an outline cutout renders as a polygon in the top view, drag moves it, the properties show width × length in the display unit. UI task without an artboard: built from existing components and tokens, said in the commit.

## 3. Photo dialog

- [x] 3.1 `PhotoDialog` shell and step 1 (choose a photo through `decodeImage`, paper preset or custom size with `LengthField`, orientation); entry button "From photo" next to Add and Import in the list; `usePhotoTrace` state kept while the page is open. Tests: the button opens the dialog, an unsupported file shows a message, Esc closes it and focus returns to the button, state survives closing and reopening.
- [x] 3.2 Step 2: `CornerEditor` (four numbered handles over the photo with pointer and keyboard moves, convexity warning) and the straightened preview that updates while dragging (debounced). Tests: dragging a handle updates the corner, arrows and Shift+arrows move by 1 and 10 px, a bowtie shows the warning and no preview.
- [x] 3.3 Step 3: sensitivity and edge-margin controls (`NumberField` / `LengthField`), `SilhouettePicker` (overlay on the straightened view, list with sizes in the display unit, click and tick toggle), empty-state message. Tests: toggling by click and by tick agree, changing sensitivity re-runs detection, no objects disables Create.
- [x] 3.4 Create: depth and clearance fields (default clearance 0.8 mm), one `outlineCutout` per kept silhouette at its paper position, existing cutouts kept, footprint fitted with `fitFootprintUnits`, colours assigned by the normal rule, dialog closes and selection goes to the first new cutout. Tests: two silhouettes 60 mm apart give cutouts 60 mm apart, footprint is the expected whole units, the count on the button matches the cutouts made.
- [x] 3.5 Help text in the dialog (shoot straight down, flat paper, dark tool on light paper, shadows) and all en and ru strings. Test: i18n parity and no hard-coded text.

## 4. Verification

- [x] 4.1 `npm test` and `npm run build` are green, the dev server starts, the console has no errors.
- [x] 4.2 In the browser, in en and ru and at 390 px, with a synthetic photo drawn on a canvas in the page and a real photo of tools if the user supplies one: place the corners, check the preview is upright and unmirrored, pick silhouettes, create; the pockets match the tools' shapes in the top view and the 3D view, the bin is the expected whole units, STL exports, and a measured 40 mm object is 40 ± 0.5 mm in the cutout properties.
