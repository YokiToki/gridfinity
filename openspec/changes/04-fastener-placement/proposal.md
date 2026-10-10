# Proposal

## Why

Magnets and screw holes are needed in Box, Baseplate and Cutout, with the same placement choices as the reference service (None / Corner / Full) plus manual placement the reference lacks. One shared capability avoids three copies.

## What Changes

- Add magnet and screw-hole settings with placement modes: None, Corner (at the footprint's outer corners only), Full (every cell), and Manual (user places individual holes).
- Add configurable magnet diameter/depth, screw diameter, optional countersink/counterbore and press-fit tolerance, with presets (6×2 mm, 6.5×2.4 mm, 8×2 mm; M3).
- Add a manual placement editor: a 2D footprint view where the user toggles holes per cell corner or places at arbitrary coordinates, with snapping and a list of placed holes.
- Show holes in the 3D preview and include them in exports.

## Capabilities

### New Capabilities
- `fastener-placement`: magnet and screw hole modes, dimensions and manual placement shared by all modes.

### Modified Capabilities

## Impact

- New `geometry/fasteners.ts`, `features/fasteners/` UI (panel + 2D placement editor).
- Replaces the prototype's `magnets`/`screws` booleans in baseplate params (state migration).
- Depends on `03-geometry-core` and `01-app-foundation`.
