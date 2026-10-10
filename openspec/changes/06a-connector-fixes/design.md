# Design

## Context

`connectors.ts` places both connector kinds at the height of the wall's vertical layer (about 1.6 mm above the pocket bottom). The key is a plan-view trapezoid extruded 1.8 mm there, so it hangs in the middle of the part. Holes are horizontal cylinders along the cut normal, placed anywhere along the cut line. The cut runs along the middle of the wall between neighbouring sockets (4.3 mm wide, 5.7 mm at the bottom, tapering to zero at the rim), so each part has only about 2.15 mm of material beyond the cut face; a 6 mm hole breaks into the neighbouring pocket. See proposal.md.

## Goals / Non-Goals

**Goals:** a dovetail that can be printed on the bed and assembled by lowering; filament-sized blind holes that always fit.

**Non-Goals:** vertical dowel holes, holes in the outer edge wall, other key shapes.

## Decisions

- **Dovetail z-range:** key from `z = 0` to `dovetailHeight` (new setting, default 2 mm); socket from `z = −1` to `dovetailHeight + clearance`, so it is open at the underside and closed above the key. The slide direction is vertical, so the plan-view trapezoid (neck at the face, tip deeper) locks the parts sideways. Alternative: a vertical key through the whole wall height — rejected, the wall tapers to zero at the rim.
- **Dovetail fit check:** the minimum wall width is sampled over `z ∈ [0, height + clearance]` (relative to the pocket bottom) and must hold `depth + clearance ≤ width/2 − 0.4`; failure is reported as before.
- **Holes in rib ends:** the ribs that cross the cut meet it at its cell boundaries; each rib is 4.3 mm wide and a full cell long, so a hole drilled along the rib from the cut fits with room to spare. Candidate positions are the cell boundaries strictly inside the face (`u = offset + k·pitch`); positions come from the nominal evenly spaced `count`/`inset` positions, snapped to the nearest free candidate (no duplicates). The same candidates are used in both parts, so the axes match. A face with no interior boundary has no candidate and reports `connector.noRib`. Alternative: keep holes on the cut line and shorten them — rejected, the wall only allows about 1.5 mm.
- **Hole depth:** the hole runs along the rib, so only the part's length limits it: `depth = min(configured, partExtentAlongNormal − 2 mm)`. It never reaches a socket because the rib is a full cell long and the hole is centred in it. The fastener-collision test stays: circles of magnet and screw holes (plus the minimum wall) against the hole's rectangle in the (normal, along-face) plane.
- **Fit check:** the hole's diameter must fit the rib's width over its height range (same sampled check as before), so the 6×2 magnet is still reported.
- **Presets:** `filament` (Ø 1.9, default), `pin2` (Ø 2.1), `pin3` (Ø 3.1), `m3` (Ø 3.2), `m6x2` (Ø 6.1, reported as not fitting). Presets set the diameter and the requested depth (6 mm for pins, 2.1 mm for the magnet); the effective depth is the lower of that and the wall limit.
- **UI:** the connectors section shows the effective depth under the depth field and the new key height field; the new `connector.noRib` warning appears for faces without a rib end.
- **Stored settings:** the new field `dovetailHeight` takes its default through the existing nested normalisation; stored presets and diameters are untouched.

## Risks / Trade-offs

- A 2 mm key 1.2 mm deep is small; strength depends on printing → parameters are exposed and the clearance stays configurable.
- One-cell-wide cut faces have no rib end → no hole there; the dovetail or a different cut is the answer, and the warning says so.
- Holes sit at cell corners, where the cut line meets a cross rib; the area is solid but the ear and the magnet hole of the neighbouring cell are about 8 mm away → covered by the collision check and a test.
