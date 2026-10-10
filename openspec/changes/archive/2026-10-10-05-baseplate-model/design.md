# Design

## Context

Current `buildBaseplate` takes integer cell counts and a single `FLOOR` constant and cuts pockets from a cube. See proposal.md.

## Goals / Non-Goals

**Goals:** drawer-sized plates, tunable thicknesses, visual parity with the reference.

**Non-Goals:** splitting into parts and connectors (`06-baseplate-split`), exports (`09-export-3mf-bambu`).

## Decisions

- **Params:** `{ pitch, x: AxisSize, y: AxisSize, thickness, floor, fasteners, preview: {showPlate, plateX, plateY} }`; `AxisSize = {mode:'units'|'mm', value, align}`.
- **Construction:** outer block (cells + padding) minus instanced socket pockets, then fasteners. Padding is a flat slab at rim height; its top is flush with the socket rim.
- **Floor and ears:** the floor thickness (0 = open frame) is a slab under the sockets and is independent of fasteners. Fasteners add ears of `FLOOR` (4 mm) height around holes (`04a-fastener-ears`): the pocket bottom is at `max(floor, 4 mm)` when any hole exists, the cell windows are cut from the floor thickness up to the pocket bottom, minus the ears. If the floor is at least as thick as the ears, the ears are absorbed by the floor. No params are normalized and no notice is needed.
- **Corner radius** on the outer outline is a thickness setting (default 4 mm) so the plate matches the socket radius.
- **Oversize warning** compares the bounding box with the preview build plate (or the printer preset when available).

## Risks / Trade-offs

- Large padding slabs next to many pockets slow booleans → instancing and a single final subtract.
- A solid floor combined with ears makes a shallow cell window → covered by a geometry test; the window is simply empty when the floor reaches the ear height.
