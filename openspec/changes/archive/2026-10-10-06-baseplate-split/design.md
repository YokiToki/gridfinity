# Design

## Context

Plates are built centred at the origin as one solid. Splitting needs cell-aligned cut lines, part-local geometry and mating connectors. See proposal.md.

## Goals / Non-Goals

**Goals:** cell-aligned splits with predictable parts; reliable mating connectors.

**Non-Goals:** cuts through cells; automatic optimization for print time; multi-colour parts.

## Decisions

- **Cut model:** `{ xCuts: number[], yCuts: number[] }` as cell indices. Auto algorithm: `n = ceil(totalCells·pitch / maxSize)` parts per axis, distribute cells evenly (remainder to first parts).
- **Generation per part:** build each part directly from its cell range (not by cutting the full solid) so large plates stay fast and parts are independent for export.
- **Connectors:** computed per cut face; face-local coordinate frame (u along the face, v up). Hole connectors are subtractions on both sides; keys add a dovetail on part A and subtract on part B with clearance.
- **Labels:** column letter + row number, stable under resizing of other parts.
- **Preview:** separate `Manifold` per part, positioned by the exploded gap in the viewport only; the geometry stays in assembled coordinates.

## Risks / Trade-offs

- Dovetails need printing tests to tune clearance → expose clearance and default conservatively (0.2 mm).
- Many parts multiply generation time → generate in the worker in parallel per part; cap parts to a sane limit with a warning.
