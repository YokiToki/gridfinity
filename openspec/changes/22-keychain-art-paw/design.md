# Design

## Context

`scripts/render-art.ts` builds the keychain art with the real `generate('keychain', …)` from an in-script bitmap (`badgeBitmap`), then `renderSvg` (`src/geometry/art/`) projects it, z-buffers a 7-tone image at 3× the viewBox, and `tracePath` turns every "tone ≥ k" region into a polygon simplified with Douglas–Peucker (tolerance 0.35 units). Observed in the committed `keychainImage.svg`: the outline is a polyline of short steps (0.3–0.7 units), i.e. the mesh edge is already stepped and the tracing only keeps it.

Two independent sources of stairs:
1. **Geometry resolution.** Relief nodes sit on a 0.25 mm grid (56 mm → 224 cells) and the 420 px source bitmap is thresholded, so mesh edges are stepped. At about 2.5 units/mm one cell is about 0.6 units, i.e. visible.
2. **Tracing.** The traced loops follow the 1/3-unit raster of the z-buffer and are only simplified into straight segments, never fitted with curves.

The Gridfinity images must not change (`box.svg` height drives `BOX_ART_HEIGHT`), and `keychainImage.svg` is already near the 60 KB budget.

## Goals / Non-Goals

**Goals:**
- A paw-print Image card art with visibly smooth outline and tone edges.
- Stay within 60 KB and keep the Keychain height equal to the box art height.
- Keep the pipeline deterministic and file-free (shape generated in code).

**Non-Goals:**
- Changing the keychain geometry pipeline used by the editor.
- Touching the Gridfinity group's output.

## Decisions

- **Paw as an analytic field in a pure helper** (`src/geometry/art/paw.ts`): a palm pad (wide ellipse with two lower lobes) and four toes (rotated ellipses, outer ones smaller and splayed), combined with a smooth minimum of signed distances so joins between pad and toes have small fillets instead of sharp notches. It renders to a `GrayImage` at high resolution with anti-aliased edge values (distance → 0..255 over about 1.5 px) so the thresholded silhouette is sub-pixel accurate. A pure function can be unit-tested (one connected region, symmetric about the vertical axis, toes separated from each other, bbox within the bitmap); the script only calls it. Alternative: ship a hand-drawn SVG/PNG of a paw. Rejected: an extra binary/asset, and a licence question, for something a few ellipses express.
- **Smooth tracing as an opt-in step.** After Douglas–Peucker, loops can be written with quadratic Béziers through segment midpoints (corner points as control points), keeping true corners where the turn angle is sharp. Opt-in through an `ArtOptions` flag (`smooth`) used only by the Keychain group, so `box.svg`, `baseplate.svg` and `cutout.svg` stay byte-identical. A higher tolerance can then be used, which also reduces file size. Alternative: Chaikin subdivision. Rejected: it multiplies points and the size.
- **Finer source for the Keychain group only.** Raise the grid to about 0.12–0.15 mm and the bitmap to about 1000 px for the art; raise `maxTriangles` in the script so the step is not enlarged by the budget. This is cheap because it runs offline. It is applied first; smooth tracing is then tuned on the result, and the order is a measurement decision in the tasks (check the stairs and the size after each).
- **Remove the star area.** The paw has no inner cut-out, so the `areas` override of the old badge goes away. The ring eyelet stays at the top, between the two middle toes, using the existing `mount` params.
- **Same height rule.** `writeGroup(..., {name: 'keychainImage', height: BOX_ART_HEIGHT})` is kept; the paw's projected aspect differs from the disc, so the width limit (`o.width - 2`) is checked after regeneration, and the Shape card is regenerated at the same scale.

## Risks / Trade-offs

- [File size over 60 KB with finer tones] → Béziers allow a larger tolerance; check `ModeArt.test.tsx` budget and, if needed, lower tone count only for this image, or raise tolerance.
- [Smoothing rounds true corners (eyelet junction, rim)] → keep corners above a turn-angle threshold as sharp; compare against the previous SVG visually.
- [Longer `npm run art` (finer grid)] → acceptable, it is a manual offline step; note the time in the task.
- [Paw looks like a blob at card size (about 150 units tall)] → toes must be separated by gaps of at least about 3 units at that scale; checked in the browser.

## Open Questions

- Exact paw proportions (toe sizes and splay) are tuned by eye against the rendered card; this does not change specs or tasks.
