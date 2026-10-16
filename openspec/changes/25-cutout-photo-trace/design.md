# Design

## Context

`Cutout.source` is a union of sources (rectangle, circle after 23, part from STL). The pocket of a part in projected mode is already a polygon (`MeshSource.hull`, `CrossSection.ofPolygons` + `grow`), so a polygon source needs no new solid-building idea. `fitFootprint` already fits the footprint to the cutouts' bounds, with the wall and margin, in mm. The Keychain mode has the image toolkit (`decodeImage` ≤ 4096 px, `GrayImage`, `otsu`, `close`, `labelComponents`, `removeSpecks`, `fillHoles`, `resampleGray`) and sub-pixel contour tracing (`traceAlpha` + `simplifyLoop`, `textOutline.ts`). Nothing exists for perspective, background correction or a corner-dragging editor.

## Goals / Non-Goals

**Goals:**
- Photo → true-scale outlines with the photo's own scale from the paper, entirely client-side.
- Pure, testable geometry for every step; thin UI on top.
- Accuracy that is limited by the photo, not by the algorithm (0.5 mm on a clean photo).

**Non-Goals:**
- Automatic paper detection, lens correction, touching-tool separation, depth from a photo.

## Decisions

- **Homography from four points** (`geometry/photo/homography.ts`): solve the 8×8 linear system (Gaussian elimination, partial pivoting) for the map paper-rectangle → photo, and sample the photo through it (bilinear) to build the straightened raster; mapping in this direction means no holes in the output. Raster scale 4 px/mm, reduced so the longest side is ≤ 2000 px (a custom 600 mm sheet still works). Alternative: transform every contour point instead of the raster. Rejected: segmentation needs the straightened pixels for background correction anyway.
- **Paper presets as data** (`paper.ts`): Letter 279.4 × 215.9, A4 297 × 210, custom clamped to 50–1000 mm. Corner order is top-left, top-right, bottom-right, bottom-left of the paper in the chosen orientation; the editor labels them 1–4, and the convexity check (cross products of consecutive edges all the same sign, area above a minimum) guards against bowties.
- **Background correction by surface fit.** Gray straightened image → seed mask by Otsu on the paper's brightness → fit a quadratic surface `a + bx + cy + dx² + exy + fy²` by least squares over pixels that are not in the (dilated) seed mask and not in the edge margin → ratio = gray / surface. A fitted surface copes with gradients and with objects bigger than any local window, where a morphological closing or a big blur treats a large dark tool as background. Two iterations are enough (refit after the first mask). Object pixel = ratio < 1 − sensitivity; the default sensitivity comes from Otsu on the ratio histogram, clamped to 0.08–0.5, and the slider offsets it. Luminance only in this change: a very light tool on white paper can fail, and the dialog says to use dark or coloured paper or a contrasting background if so. Alternatives: HSV saturation or colour distance (better on pale tools but more tuning and a colour pipeline that `GrayImage` does not carry) — left for later.
- **Cleanup:** `close` (0.8 mm radius, joins thin gaps in glare), `removeSpecks` below 2 mm², edge-margin mask (default 3 mm), `fillHoles` (a pocket is the outline, so enclosed gaps in a wrench head are filled), `labelComponents` (8-connected). Silhouettes smaller than 3 mm in either direction are dropped.
- **Outline:** `traceAlpha` on the mask lightly blurred (σ 1 px) gives sub-pixel polygons; the longest outer loop is kept (holes dropped), `simplifyLoop` at 0.15 mm, orientation made counter-clockwise, y flipped to the bin's y-up, points moved to be relative to the bounding box centre; the cutout's x, y is that centre in paper coordinates measured from the paper centre. Alternative: convex hull. Rejected: it would fill the notches that make a tool sit firmly.
- **`OutlineSource = { kind: 'outline'; points: [number, number][]; size: { w: number; l: number } }`.** `baseOutline` returns the points, so `cutoutBounds`, centring, alignment, snapping and distribution work with no new branch; the pocket is `CrossSection.ofPolygons([points])` then `placeCS(grow(…))` like the hull path, the tool preview is the same extrusion without the clearance. `validateCutout` drops outlines with fewer than 3 points or an area below 1 mm² on load (migration) and flags them if they appear otherwise.
- **Footprint in whole units.** A new `fitFootprintUnits(p)` in `cutout-placement.ts` wraps `fitFootprint`: take its sizes, convert to units with `ceil(size / pitch)` (at least 1), return `AxisSize { mode: 'units' }`, re-centre the cutouts. Create always applies it, as asked ("minimal number of Gridfinity units").
- **Dialog and state.** `PhotoDialog` (large modal, like the Keychain mask enlargement: Esc, outside click, focus returns to the button) has three steps with Back and Next. State is a hook `usePhotoTrace` held in `CutoutMode`, so closing and reopening in the same session keeps photo, corners and settings; nothing is persisted (a photo is large and the created cutouts, which are persisted, are the result). Heavy work (warp, fit, label, trace) runs on the main thread, debounced 120 ms while dragging; every stage is linear in pixels (≈ 1.2 M for A4 at 4 px/mm), measured at under 150 ms in the task.
- **Corner editor.** SVG over the photo with four handles (pointer capture, keyboard arrows move a handle by 1 px, 10 px with Shift), initial corners an inset rectangle at 15 % of the image; a small loupe is not needed because the corners can be zoomed with the browser. The straightened preview sits beside it (below at narrow widths).
- **Strings and UI rules.** All text through i18n (en and ru), lengths through `LengthField`, an artboard does not exist (build from `ui/` components and tokens, said in the tasks).

## Risks / Trade-offs

- [Parallax: tall objects look bigger] → the dialog says to shoot straight down from a distance; the clearance default for photo cutouts is 0.8 mm instead of 0.5 mm and is editable.
- [Shadows around tools enlarge silhouettes] → the sensitivity slider and the preview; soft shadows usually fall inside the 0.8 mm default clearance.
- [Pale tools on white paper are not detected] → known limitation, written in the dialog help; colour segmentation is a later change.
- [Large photos (4096 px) make the warp slow] → sampling cost depends on the output size (≤ 2000 px), not on the photo.
- [Wrong corner order mirrors the result] → the handles are numbered, the preview shows an "up" arrow, and a test checks that a known asymmetric shape comes out unmirrored.

## Open Questions

- The exact default sensitivity range and the speck and margin defaults are tuned on real photos during the browser task; they do not change the specs.
