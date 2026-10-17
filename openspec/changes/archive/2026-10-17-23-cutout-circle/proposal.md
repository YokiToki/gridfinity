# Proposal

## Why

The Cutout mode can cut only a rounded rectangle or a pocket from an imported STL. Round things (batteries, bits, markers, round tubes standing upright, screws) are the most common thing to hold, and a rounded rectangle with radius = half the width is an awkward way to make a circle: two fields must be kept equal and the radius limit has to be remembered.

## What Changes

- **New cutout source: Circle.** A circular pocket with a diameter (`LengthField`, mm), the same depth, clearance, position and visibility as other cutouts. Rotation is accepted but has no visible effect.
- **Add control.** The single "Add rectangle" button becomes two: Rectangle and Circle. The list, selection, duplicate, reorder and delete work as before; a new circle gets the default name "Circle" and a default diameter of 20 mm.
- **TopView and 3D.** The circle is drawn as a circle (grown by the clearance) in the top view and as a cylinder in the translucent 3D tool; placement, snapping, centring, alignment, distribute and "fit footprint" use its exact bounds, which do not depend on rotation.
- **Validation.** Diameter must be positive; the existing overlap and bounds feedback covers circles with their clearance.
- **Stored data.** Older stored cutouts (rect, mesh) load unchanged; the migration accepts the new kind and drops circles with a missing or invalid diameter.

## Capabilities

### New Capabilities

### Modified Capabilities
- `cutout-model`: the cutout list offers a circle source and a circular cutout is defined.

## Impact

- `geometry/cutout.ts` (`CircleSource`, `circleCutout`, outline and bounds, pocket and tool solids, validation), `features/cutout/{CutoutPanel,TopView,migrate}`, `cutout.*` strings in en and ru, tests.
- Out of scope: ellipse, capsule or slot sources, a pocket for a cylinder lying on its side, chamfered or tapered holes, per-cutout colours (`24-cutout-colors`), the photo-based sources.
- Depends on: `08-cutout-mode`.
