# Design

## Context

Patterns in `geometry/rack/patterns/` are functions `(region, settings, rotate) → CrossSection` for through cuts. Asanoha is built from strokes that must stay material, so the cut is the set of openings between them. The Hicks hexagon's elements are nested rings, which isolate inner pieces unless the construction is chosen carefully.

## Goals / Non-Goals

**Goals:**
- Both patterns read like the reference thumbnail (the Kiwiworks panel generator: carpet-like nested hexagons; a star lattice for asanoha).
- Geometry stays pure and testable; one connected piece for through patterns.

**Non-Goals:**
- Other kumiko lattices, chamfered grooves, colour fills.

## Decisions

- **Asanoha geometry.** Hexagon centres on a honeycomb of the chosen flat-to-flat width `w`, circumradius `R = w / √3`. Main strokes: the six sides and the three long diagonals of each hexagon, which together are the edges of a triangular lattice with edge `R`; shared edges are drawn once (deduplicated by endpoints). Detail strokes: in each of the lattice's equilateral triangles three segments from its centroid to its three corners. Each segment becomes a stroke polygon of the chosen width (a rectangle with square ends so strokes join at the nodes) and all strokes are united. The cut is the region minus the strokes, reduced to the openings that lie completely inside the region (components touching its edge stay solid), so the strokes form one network joined to the frame and the panel stays one piece. Alternative: draw each hexagon separately. Rejected: it doubles the strokes where hexagons meet.
- **Hicks geometry.** On the same honeycomb, each cell contains nested hexagons of decreasing size: the material stroke `s`, then the cut whitespace `g`, repeating inward until the remaining hexagon is smaller than `s`, which stays solid. To keep every material ring attached, each cut ring is interrupted by bridges of width `s` at three alternating vertices (every second vertex of the hexagon, so adjacent rings use different vertices). This matches the carpet look (a spiral-like continuous stroke) and guarantees one piece. The exact bridge positions are tuned against the reference thumbnail while implementing; the one-piece test is the invariant. Alternative: drawing only open polylines. Rejected: it changes the cut-versus-material meaning of the two widths.
- **Edge cells (Hicks).** The honeycomb lattice has one origin (the first complete cell, or the region centre when none fits). Complete cells are cut as they are; with the `edgeCells` option the cells that only touch the region are added too, clipped by the region, so the pattern fills the window up to its border.
- **UI.** The Pattern section adds the two kinds: asanoha (hexagon width, main stroke width, detail stroke width, 0 = off) and Hicks (hexagon width, stroke, whitespace, edge cells); `LengthField` throughout, defaults from the reference generator, tuned by eye. The migration keeps older stored panels valid because new kinds only add values.

## Risks / Trade-offs

- [Fine strokes are hard to print at 0.4 mm nozzles] → the minimum stroke width warning (0.8 mm) applies to the strokes of both patterns; the defaults are above it.
- [The Hicks construction differs visibly from the reference] → compared against the reference thumbnail in the browser task; the one-piece check and the width scenarios are the contract.
- [Many small polygons make a large mesh] → a 10 U panel at the default width stays under a few hundred thousand triangles; measured in the task, and the pattern is built once per parameter change in the worker.

## Open Questions

- The default hexagon width and stroke widths for the two patterns follow the reference generator's visual density and are tuned in the browser; they do not change the specs.
