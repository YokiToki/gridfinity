# Design

## Context

`26-rack-panels` provides `buildRackPlate(params)` (outline, ears, tolerance, thickness, one-piece check), the hexagon pattern as a `CrossSection` over a region and the `rack` product with a mode registry. The reference generator (spuder's mini-rack) exposes: rack width and height, component width, depth and height, keystones, front wire holes and their diameter, air holes, half-height holes, case thickness, front plate thickness, front plate hole, front lip and tolerance. The model is built in print orientation: the front plate lies on the bed, the shell rises from its back face.

## Goals / Non-Goals

**Goals:**
- One part that is correct for any device that fits the rails, with errors that say what to change.
- Reuse the panel plate and hexagon vents so the two modes agree on ears and tolerances.

**Non-Goals:**
- Lids, internal rails, fans, several devices, device presets.

## Decisions

- **Geometry.** The plate comes from the panel builder with the unit count from the enclosure rules. The shell is a prism in front of nothing: a rectangle `outer = device + 2 × (gap + wall)` extruded from the plate's back face for `depth + gap`, minus an inner prism `device + 2 × gap` (open at the back), centred horizontally on the plate and vertically on the plate's centre line. Everything is unioned with the plate and cut by the window, keystones, cable holes and vents. Alternative: build the shell from five separate walls. Rejected: boolean prism difference is exact and simpler.
- **Units.** `autoUnits = ceil((outerHeight + heightTolerance) / 44.45)`; the plate height `units × 44.45 − tolerance`; a user value below the automatic number is raised to it with a note. Width check against `windowWidth = 222.25`, error key `rack.error.tooWide` with the excess as a parameter.
- **Window and lip.** Window = device front reduced by the lip on every side, rounded corners (radius 2 mm, limited by the half size), centred like the device; with lip 0 the whole device front shows. A lip larger than half the device size is invalid.
- **Keystones.** Standard opening as constants in `rack/spec.ts` (width 14.5 mm, height 16.0 mm, spacing 19.0 mm between centres), placed in a row to the side of the window or below it, centred in the free plate area; if the free area cannot take them, a message and they are not cut. These numbers are checked against a datasheet or a real jack before the task is closed, and corrected in one place if needed.
- **Cable holes:** `none | one | two`, diameter default 8 mm, centred in the free area beside the window; the same fit check as keystones.
- **Vents:** reuse the hexagon `CrossSection` generator over the free wall area of the top and side walls (inset 6 mm from edges and the plate), cut through the wall thickness only (the cutter prism is limited to the wall, so the device cavity is not touched). Floor stays solid by default (a bottom option is not offered).
- **Mode plumbing:** `ModeParams.rackCase`, `generate('rackCase')` returns one part `case`; mode path `/rack/case`, key `rack.case`; the Rack chooser gets a second card with art `rackCase` (a render of a 2 U enclosure).
- **UI sections:** Device (width, depth, height, gap), Shell (wall, plate thickness, units shown and optional override), Front (window, lip, keystones, cable holes), Ears (shared defaults, same fields as the panel), Vents. Lengths through `LengthField`, numbers through `NumberField`; section summaries and changed highlights as elsewhere; no artboard, built from the components.

## Risks / Trade-offs

- [Large shells exceed the printer bed in depth] → the export panel already reports the fit; a deep enclosure may need a split, not offered here.
- [Printing the shell roof over the device needs bridging or supports] → printed front-face down, the roof is a bridge of up to the device width; the help text mentions this and the ventilation hexagons help drain heat, not printing.
- [Keystone dimensions vary by vendor] → constants in one place, with the check described above.

## Open Questions

- Whether the shell should offer rounded outer corners; the default is square, no spec impact.
