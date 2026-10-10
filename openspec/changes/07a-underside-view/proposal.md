# Proposal

## Why

The bottom of a model matters: the magnet pockets and screw holes of a bin, the ears and connector holes of a baseplate are all on the underside. The 3D view currently stops the camera at the horizon (it cannot pass through the XY plane), so the underside cannot be inspected.

## What Changes

- Let the camera orbit freely through the XY plane, so the model can be seen from below. The view stays Z-up and never flips over at the poles.
- While the camera is below the model's ground plane, hide the ground grid (and the build plate overlay), so they do not cover the underside. They fade out and in smoothly when the camera crosses the plane.
- Light the underside: add a fill light from below so the bottom faces are not dark.
- Keep the existing gizmo: its "−Z" end already points the view from below; it now works for any model.

## Capabilities

### New Capabilities
- `model-viewport`: how the 3D preview is navigated and what is drawn around the model (orbit limits, grid, build plate, lighting).

### Modified Capabilities

## Impact

- `features/viewport/Viewport.tsx` only (controls limits, grid and plate visibility, lights), plus tests for the pure helpers that decide visibility.
- Out of scope: a section/clipping plane, wireframe or x-ray view, any change to the model or to exports.
- Depends on: `01-app-foundation` (archived); useful to all modes.
