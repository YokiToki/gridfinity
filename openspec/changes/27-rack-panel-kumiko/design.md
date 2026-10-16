# Design

## Context

Patterns in `geometry/rack/patterns/` are functions `(region, settings, rotate) → CrossSection` for through cuts. Asanoha is different in kind: it is engraved, so the panel builder needs a second kind of cut that goes only part-way. The Hicks hexagon is through-cut but its elements are nested rings, which isolate inner pieces unless the construction is chosen carefully.

## Goals / Non-Goals

**Goals:**
- Both patterns read like the reference thumbnail (the Kiwiworks panel generator: carpet-like nested hexagons; a star lattice for asanoha).
- Geometry stays pure and testable; one connected piece for through patterns.

**Non-Goals:**
- Other kumiko lattices, chamfered grooves, colour fills.

## Decisions

- **Two cut kinds.** A pattern returns `{ through?: CrossSection; engrave?: { shape: CrossSection; depth: number }[] }`. The panel builder subtracts `through` over the full thickness and each `engrave` item from the front face down to its depth (an extruded prism below the front plane). Existing patterns return only `through`, unchanged.
- **Asanoha geometry.** Hexagon centres on a honeycomb of the chosen flat-to-flat width `w`, circumradius `R = w / √3`. Main strokes: the six sides and the three long diagonals of each hexagon, which together are the edges of a triangular lattice with edge `R`; shared edges are drawn once (deduplicated by endpoints). Detail strokes: in each of the lattice's equilateral triangles three segments from its centroid to its three corners. Each segment becomes a stroke polygon of the chosen width (a rectangle with round ends joined by union, `CrossSection` offset of a polyline), clipped to the region. Alternative: draw each hexagon separately. Rejected: it doubles the strokes where hexagons meet.
- **Hicks geometry.** On the same honeycomb, each cell contains nested hexagons of decreasing size: the material stroke `s`, then the cut whitespace `g`, repeating inward until the remaining hexagon is smaller than `s`, which stays solid. To keep every material ring attached, each cut ring is interrupted by bridges of width `s` at three alternating vertices (every second vertex of the hexagon, so adjacent rings use different vertices). This matches the carpet look (a spiral-like continuous stroke) and guarantees one piece. The exact bridge positions are tuned against the reference thumbnail while implementing; the one-piece test is the invariant. Alternative: drawing only open polylines. Rejected: it changes the cut-versus-material meaning of the two widths.
- **Depth rule.** `maxDepth = thickness − 0.8` (one 0.4 mm nozzle width of floor each side would be 0.8; the front face keeps at least two perimeters of solid behind the groove); depths above it are limited and a `rack.warning.depth` is shown. A depth of 0 omits the set.
- **UI.** The Pattern section adds the two kinds: asanoha (hexagon width, main width and depth, detail width and depth) and Hicks (hexagon width, stroke, whitespace); `LengthField` throughout, defaults from the reference generator, tuned by eye. The migration keeps older stored panels valid because new kinds only add values.

## Risks / Trade-offs

- [Engraved fine lines are hard to print at 0.4 mm nozzles] → the minimum stroke width warning (0.8 mm) applies to engraved strokes too; the defaults are above it.
- [The Hicks construction differs visibly from the reference] → compared against the reference thumbnail in the browser task; the one-piece check and the width scenarios are the contract.
- [Many small polygons make a large mesh] → a 10 U panel at the default width stays under a few hundred thousand triangles; measured in the task, and the pattern is built once per parameter change in the worker.

## Open Questions

- The default hexagon width and stroke widths for the two patterns follow the reference generator's visual density and are tuned in the browser; they do not change the specs.
