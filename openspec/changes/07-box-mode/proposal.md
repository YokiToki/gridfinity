# Proposal

## Why

The main use of Gridfinity is bins. Box mode produces a bin/tray of arbitrary footprint (not only multiples of 42 mm) with the features the reference offers plus finer control.

## What Changes

- New Box mode generating a bin: footprint (fractional X/Y units or mm), height in Z units (7 mm) or exact mm, standard foot, outer walls and floor.
- Lip style (the stacking "ledge"): Default, Thin, None. The lip is the rim profile at the top of the bin that mates with the foot of a bin stacked above; None gives a flat top.
- Scoop: finger scoop along one or more inner edges with configurable radius.
- Thickness settings: outer wall, inner wall (dividers), floor, lip, clearance.
- Compartments: divide the interior into a grid or custom compartments with divider walls (the reference's "Elements").
- Magnets and screws through the shared fastener settings (bottom of the bin).
- Non-integer footprints: bin outer size equals the requested size minus clearance; feet only on full cells, padding area has a plain floor.

## Capabilities

### New Capabilities
- `box-model`: parametric bin/tray geometry and its settings.

### Modified Capabilities

## Impact

- New `geometry/box.ts`, `features/box/*`; replaces the Box placeholder.
- Depends on `01-app-foundation`, `03-geometry-core`, `04-fastener-placement`.
