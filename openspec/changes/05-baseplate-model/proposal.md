# Proposal

## Why

The prototype baseplate only supports whole-unit sizes, fixed thicknesses and a simple boolean for magnets/screws. The real use case is a drawer of arbitrary size needing a plate that fits it, with tunable thicknesses and a profile close to the reference service.

## What Changes

- Fractional X/Y size (units or mm) with padding and alignment, using `fractional-sizing`.
- Thickness settings: base height, floor thickness, outer wall/rim, padding height, clearance.
- Optional solid floor with selectable style (open frame, solid floor) and Z height readout.
- Replace magnet/screw booleans with the shared `FastenerSection`.
- Show Build Plate preview toggle with size presets.
- Measurements readout in mm/inch.
- Profile polish: vertical outer walls with rounded outer corners, matching the reference look; padding drawn flush with the cell block.

## Capabilities

### New Capabilities
- `05-baseplate-model`: parametric baseplate geometry, size handling and preview/measurements.

### Modified Capabilities

## Impact

- `geometry/baseplate.ts`, `features/baseplate/*`; persisted state migrates to the new params shape.
- Depends on `01-app-foundation`, `03-geometry-core`, `04-fastener-placement`.
