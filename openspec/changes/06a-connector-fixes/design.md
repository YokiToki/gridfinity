# Design

## Context

`connectors.ts` places both connector kinds at the height of the wall's vertical layer (about 1.6 mm above the pocket bottom). The key is a plan-view trapezoid extruded 1.8 mm there, so it hangs in the middle of the part. Holes are horizontal cylinders 6 mm deep along the cut normal. The wall between neighbouring sockets is 4.3 mm wide (5.7 mm at the bottom, tapering to zero at the rim), so each part has only about 2.15 mm of material beyond the cut face; a 6 mm hole therefore breaks into the neighbouring pocket. See proposal.md.

## Goals / Non-Goals

**Goals:** a dovetail that can be printed on the bed and assembled by lowering; holes sized for filament that stay inside the wall.

**Non-Goals:** vertical dowel holes, longer pins, other key shapes.

## Decisions

- **Dovetail z-range:** key from `z = 0` to `dovetailHeight` (new setting, default 2 mm); socket from `z = −1` to `dovetailHeight + clearance`, so it is open at the underside and closed above the key. The slide direction is vertical, so the plan-view trapezoid (neck at the face, tip deeper) locks the parts sideways. Alternative: a vertical key through the whole wall height — rejected, the wall tapers to zero at the rim.
- **Dovetail fit check:** the minimum wall width is sampled over `z ∈ [0, height + clearance]` (relative to the pocket bottom) and must hold `depth + clearance ≤ width/2 − 0.4`; failure is reported as before.
- **Hole depth limit:** `holeDepthLimit = min over the hole's z-extent of (wall width / 2 − MIN_WALL)`. The effective depth is `min(configured depth, limit)`; a limit under 0.8 mm counts as "does not fit". The plan carries the effective depth and the geometry uses it, so holes are blind by construction.
- **Presets:** `filament` (Ø 1.9, default), `pin2` (Ø 2.1), `pin3` (Ø 3.1), `m3` (Ø 3.2), `m6x2` (Ø 6.1, reported as not fitting). Presets set the diameter and the requested depth (6 mm for pins, 2.1 mm for the magnet); the effective depth is the lower of that and the wall limit.
- **UI:** the connectors section shows the effective depth under the depth field and the new key height field; existing warnings stay.
- **Stored settings:** the new field `dovetailHeight` takes its default through the existing nested normalisation; stored presets and diameters are untouched.

## Risks / Trade-offs

- A 2 mm key 1.2 mm deep is small; strength depends on printing → parameters are exposed and the clearance stays configurable.
- The effective hole depth is at most about 1.5 mm per part, so a pin is about 3 mm long → noted in the UI help.
