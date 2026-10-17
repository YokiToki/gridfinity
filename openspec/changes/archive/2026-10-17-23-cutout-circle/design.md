# Design

## Context

`Cutout.source` is `RectSource | MeshSource` (`geometry/cutout.ts`). Every place that needs the outline or the pocket branches on `source.kind === 'rect'`: `baseOutline` (used by `cutoutBounds`, which drives centring, alignment, snapping, distribution and footprint fitting through `cutout-placement.ts`), `pocketSolid`, `buildCutoutTools` (translucent preview), `validateCutout`, `TopView` (a `<rect>` or a `<polygon>`), `CutoutPanel` (rect fields or `MeshProps`) and `migrateCutout` (accepts only `rect` and `mesh`). `roundedRectCS` in `bin.ts` builds the rectangle cross-section and `grow` applies the clearance with a round offset.

## Goals / Non-Goals

**Goals:**
- A circle source that behaves exactly like the other sources everywhere a cutout is used.
- Exact bounds independent of rotation.

**Non-Goals:**
- Other primitives (ellipse, capsule), cylinders lying on their side, tapered or chamfered pockets.

## Decisions

- **`CircleSource = { kind: 'circle'; diameter: number }`** next to `RectSource`; `Cutout['source']` becomes a union of three. A discriminated union keeps `kind` checks exhaustive in TypeScript, so a missed branch is a compile error. Alternative: a rect with radius = half the width. Rejected: two coupled fields, rotation still changes its bounds, and it is not what the user asks for.
- **Cross-section:** `CrossSection.circle(d / 2, segments)` with 96 segments (a 21 mm hole stays within 0.01 mm of the true circle), then the usual `placeCS(grow(…))`. The same function is used for the pocket and the preview tool, so they cannot diverge.
- **Bounds:** `baseOutline` returns a polygon with the same 96 points (the top view and any outline consumer get a real circle shape), but `cutoutBounds` special-cases the circle as `x ± (d/2 + clearance)`, `y ± (d/2 + clearance)` so the box is exact and unaffected by rotation and by the polygon's vertex phase.
- **TopView:** a `<circle>` with radius `d/2 + clearance` (the rectangle branch already draws the clearance in the shape); same `transform`, `data-testid` and handlers so dragging and selection need no change.
- **Add UI:** two buttons share the first row of the list section (Rectangle, Circle) next to Import; the "Add rectangle" string becomes "Rectangle" and a "Circle" string is added, both in en and ru. A new `circleCutout(over)` factory mirrors `rectCutout`: name from i18n, depth `min(10, maxDepth)`, diameter 20 mm.
- **Panel:** a `LengthField` for the diameter (min 1, max 300 mm) replaces the width/length/radius block for a circle; rotation stays for uniformity and does nothing visible.
- **Validation and migration:** `validateCutout` flags `cutout.error.size` when the diameter is not positive; `migrateCutout` accepts `kind: 'circle'` and drops circles whose diameter is not a positive number. The key `gridfinity.cutout` is unchanged, so rect and mesh data load as before.

## Risks / Trade-offs

- [A missed `kind === 'rect'` branch makes circles take the mesh path and crash] → the union type turns each such branch into a compile error; a test builds a bin with all three kinds.
- [Rotation field is meaningless for a circle] → kept for a uniform panel; the TopView rotation of a circle is invisible, which matches the model.
