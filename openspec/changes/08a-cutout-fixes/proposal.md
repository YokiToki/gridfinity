# Proposal

## Why

Two problems found while trying Cutout mode:

1. The shape that is being cut out is invisible: after a pocket is subtracted, the user cannot see what part or rectangle sits in it, nor whether it is the right size and orientation.
2. "True 3D" mode works badly. The pocket is the part's exact volume, so every undercut and overhang of the part (a handle, a notch, a T-bar lying on its side) leaves material under or around it, and the part cannot be lowered into the pocket. For meshes that are not watertight the mode falls back to the hull and loses the shape altogether.

## What Changes

- **Cutting tool preview:** every visible cutout is also drawn in the 3D view as a translucent body of a different colour (the rectangle extruded to its depth, or the part's own mesh, unchanged). It is for preview only: it is not part of the model, the volume or any export, and can be switched off.
- **True 3D cuts the part as it is:** the pocket is the part's own volume standing on the pocket floor (the clearance is a real 3D offset of the surface, not a scale), open above the part by its silhouette. No steps or layers.
- **Closing the shape for imperfect meshes:** an open or self-intersecting mesh is no longer reduced to its convex hull. The cross-sections of the surface are closed (the outline of every slice is filled), so a pocket is still produced from a mesh that is not a valid solid (a stepped approximation). The convex hull remains only for meshes that yield no usable slices.

## Capabilities

### New Capabilities

### Modified Capabilities
- `cutout-import`: the True 3D cutting mode and the mesh robustness fallback.
- `model-viewport`: the translucent cutting tool overlay.

## Impact

- `geometry/cutout.ts` (`pocketSolid` for 3D mode, slice closing, tool bodies), `geometry/stl-import.ts` (slicing helper), `geometry/model.ts` (`ModelResult.tools`), `features/viewport/Viewport.tsx` (translucent tool meshes, toggle), `features/cutout/CutoutPanel.tsx` (hint text for 3D mode), i18n keys, tests.
- Out of scope: circle primitive, "through vs to depth", automatic depth from the part height, a draft angle on the pocket walls, tool preview in Box/Baseplate.
- Depends on: `08-cutout-mode` (archived).
