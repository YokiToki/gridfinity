# Design

## Context

`26-rack-panels` has `plateBase` (outline with corner radius, height tolerance and ear holes, in the XY plane with x from the panel centre and y from its lower edge) and `rackLayout`; `28-rack-enclosures` shows how a mode adds `ModeParams`, a `generate` case, a migration and a Rack chooser card. The shelf is a union of a standing plate and a flat slab.

## Goals / Non-Goals

**Goals:**
- A shelf that prints without supports and without a flip, strong along its length.
- The same plate, ears and tolerance as the other Rack modes.

**Non-Goals:**
- Gridfinity, gussets, perforation, shelves above the lower edge.

## Decisions

- **Frame (print orientation).** Bed is z = 0. The plate is built with `plateBase` in the XY plane and extruded by its thickness, then rotated 90° about X so it stands: x across, z up from the bed along its height, y from 0 (front face) to the plate thickness. The shelf slab is `width × depth × thickness` with its lower face on the bed (z 0…thickness), in front of nothing: y from the plate's back face to back face + depth, x centred. The union is made exact by letting the slab start 0.01 mm inside the plate (the `SLAB_T` trick), so no coincident faces. Alternative: model in rack orientation and rotate at export. Rejected: the export orientation options only flip and quarter-turn, and printing the shelf flat is the point (layers along the load).
- **Shelf at the lower edge only.** The shelf's underside is flush with the plate's lower edge, so the part needs no supports; a raised shelf would have to cantilever over empty bed. A level setting is therefore not offered.
- **Width.** `shelfWidth = 222.25 − 2 × clearance` (default 0.25 mm), centred. The plate's rounded lower corners do not touch the shelf.
- **Lips.** A rectangular ring on the shelf's top face along the left, right and back edges: outer = the slab outline, wall `lipWall`, height `lipHeight` above the slab; the side near the plate has no lip. Built as the slab outline minus its inset by the wall, minus the front strip, extruded. Height 0 omits it. Validation keeps `lipWall` between 0.8 and 6 mm and `lipHeight` ≤ the plate height minus the shelf thickness.
- **Validation keys** (`rack.error.*`): units 1–10, plate thickness 1.5–8, shelf thickness 1.5–10 and below the plate height minus 2 mm, depth 20–400, clearance 0–2, ear size as for panels, lip ranges.
- **Mode plumbing:** `ModeParams.rackShelf`, `generate('rackShelf')` returns one part `shelf`; path `/rack/shelf`, key `rack.shelf`, a migration normalising nested objects (ears use the same normalisation as the panel). The Rack chooser gets a third card with art `rackShelf` (a render of a 2 U shelf with lips).
- **UI sections:** Plate (units, thickness, corner radius, tolerance), Shelf (depth, thickness, clearance, lip height and wall), Ears (the shared section). `LengthField` for lengths, `NumberField` for units; summaries and changed highlights as in the other modes; no artboard, built from the components.

## Risks / Trade-offs

- [A deep shelf exceeds the printer bed] → the export panel already reports the fit; splitting is out of scope.
- [A thin plate standing at the edge of a long shelf is a weak joint] → the plate overlaps the slab and the shelf lips tie into the slab; the default plate thickness (3 mm) and the help text mention it, and gussets are a later option.
- [The plate's ear holes print horizontally] → they are small round or slot holes; bridging them is normal printer territory.

## Open Questions

- Whether the plate should stand (shelf flat, strong) or lie (plate on the bed, shelf upright); the design chooses standing for strength. The geometry is the same up to a rotation, so switching is cheap.
