# Design

## Context

The prototype has two booleans and hard-coded offsets (13 mm, Ø6.5×2.4, Ø3). See proposal.md.

## Goals / Non-Goals

**Goals:** one `FastenerConfig` type and one `fastenerCuts(config, footprint)` function used by all modes; a reusable 2D editor.

**Non-Goals:** per-hole sizes (all holes of one kind share dimensions); threaded insert geometry.

## Decisions

- **Data model:** `{ mode: 'none'|'corner'|'full'|'manual', manual: Point[] }` per fastener kind plus shared dimensions. Computed positions are derived from the footprint resolution (`fractional-sizing`), so padding areas never get holes unless manual.
- **Output:** `fastenerCuts` returns `Manifold[]` to subtract and a `Point[]` list the 2D editor can render; geometry and editor read the same list.
- **Position origin:** footprint centre at (0,0), matching the model; the editor displays coordinates from the footprint corner for usability.
- **Switching to Manual** materializes the current computed points into `manual` so nothing is lost.
- **2D editor:** SVG with the cell grid, snap points and draggable holes; no new dependency.
- **Migration:** persisted `magnets: true` → `full`, `screws: true` → `full`; version field in persisted state.

## Risks / Trade-offs

- Manual holes near the model edge can break the solid → validate distance to the outline and warn.
- Magnet holes at Corner for fractional footprints need a defined corner cell → use the first/last full cells.
