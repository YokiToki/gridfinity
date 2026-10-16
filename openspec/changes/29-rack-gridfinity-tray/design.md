# Design

## Context

`geometry/baseplate.ts` builds a baseplate from `BaseplateGeometry = {pitch, x: AxisSize, y: AxisSize, thickness, fasteners}` where an `AxisSize` in `mm` mode fits whole cells into the given length and puts the rest in padding (`align`), and `baseplateLayout` returns cells, padding and offsets; `thickness` has the base height, floor, rim, padding drop and corner radius. `buildBaseplate` returns a solid with the plate's bottom at z = 0. The rack plate builder from `26-rack-panels` gives the front plate with ears. `features/baseplate` has the thickness and fastener sections.

## Goals / Non-Goals

**Goals:**
- Reuse the baseplate builder unchanged so a tray baseplate and a Baseplate-mode baseplate are the same geometry.
- Print orientation: the part is modelled as it is printed, baseplate flat on the bed, the front plate standing at one edge.

**Non-Goals:**
- Splitting, drawers, side and back walls.

## Decisions

- **Frame.** The shelf is built with `buildBaseplate` using `x = { mode: 'mm', value: windowWidth, align: 'center' }` and `y` in units or millimetres; the result's x is the rack width direction, y the depth direction and z up (print direction). The rack front plate is built flat (z = thickness direction) and rotated 90° about X so that it stands at the front edge (y = 0) with its outline in the XZ plane, then the shelf is translated to sit just behind it (y ≥ plate thickness) at `shelfLevel` above the plate's lower edge (z offset). The union is exact because the plate overlaps the shelf's front edge by a fraction of a millimetre (0.01 mm, the same trick as `SLAB_T`) to avoid coincident faces. Alternative: model in rack orientation and rotate at export. Rejected: the export panel's orientation options cover flipping and quarter turns only, and printing the baseplate flat is the whole point.
- **Window width and padding.** `windowWidth = 222.25 − 2 × clearance` with a default clearance of 0.25 mm each side so the tray slides between the rails; the leftover after whole cells goes to padding, symmetric. The baseplate padding drop and rim from the baseplate thickness settings apply as in the Baseplate mode.
- **Shelf level and plate height.** `shelfLevel` ≥ 0 and `shelfLevel + baseHeight ≤ plateHeight`; the validation key `rack.error.shelfTooHigh`. Headroom `= plateHeight − shelfLevel − baseHeight` in mm and `floor(headroom / 7)` height units, shown as an info line in the panel (the Gridfinity height unit constant already exists in `spec.ts`).
- **Plate height.** Units 1–10, default 2 (a 2 U tray holds bins up to about 11 units tall); the tolerance and ear holes are the panel's.
- **Fasteners.** The baseplate fastener config is passed through unchanged (default none) and the existing `FastenerSection` is reused, so magnets or screws work as in the Baseplate mode.
- **Mode plumbing.** `ModeParams.rackTray = { plate: RackPlateParams; shelf: BaseplateGeometry-like (pitch, depth AxisSize, thickness, fasteners); shelfLevel; clearance }`, `generate('rackTray')` returns one part `tray`; path `/rack/tray`, key `rack.tray`, a migration that normalises nested objects (including fasteners, as the baseplate migration does). The Rack chooser gets a third card with art `rackTray`.
- **UI:** sections Plate (units, thickness, tolerance, ears), Shelf (pitch, depth, level, headroom info), Floor (the existing baseplate thickness section), Fasteners (the existing section); `LengthField` everywhere, summaries and highlights as in the other modes; no artboard, built from existing components.

## Risks / Trade-offs

- [A deep tray exceeds the printer bed] → the export panel already warns; splitting is a future change that can reuse the baseplate split.
- [The overlap trick leaves a seam] → 0.01 mm overlap, unioned; validated with `expectValidSolid` and a one-component check.
- [The tray collides with the rails at 222.25] → the default clearance of 0.25 mm per side and a setting for it.

## Open Questions

- Whether the shelf should also have side lips to keep bins from sliding sideways: the baseplate rim already provides this; no new setting.
