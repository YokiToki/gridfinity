# Design

## Context

Current `buildBaseplate` takes integer cell counts and a single `FLOOR` constant and cuts pockets from a cube. See proposal.md.

## Goals / Non-Goals

**Goals:** drawer-sized plates, tunable thicknesses, visual parity with the reference.

**Non-Goals:** splitting into parts and connectors (`baseplate-split`), exports (`export-3mf-bambu`).

## Decisions

- **Params:** `{ pitch, x: AxisSize, y: AxisSize, thickness, floor, fasteners, preview: {showPlate, plateX, plateY} }`; `AxisSize = {mode:'units'|'mm', value, align}`.
- **Construction:** outer block (cells + padding) minus instanced socket pockets, then fasteners. Padding is a flat slab at rim height; its top is flush with the socket rim.
- **Floor:** a slab under pockets; when fasteners need depth and floor is smaller than the minimum, params are normalized (floor raised) and a message key is returned alongside the model so the UI can show the notice.
- **Corner radius** on the outer outline is a thickness setting (default 4 mm) so the plate matches the socket radius.
- **Oversize warning** compares the bounding box with the preview build plate (or the printer preset when available).

## Risks / Trade-offs

- Large padding slabs next to many pockets slow booleans → instancing and a single final subtract.
- Floor/fastener auto-adjust may surprise users → always show the notice, never silent.
