# Proposal

## Why

Keychains are currently made by an agent pipeline (`~/sandbox/openscad-agent`, skill `blender-relief-model`): reference image → silhouette → distance-transform heightfield → Blender cleanup → OpenSCAD print sheet. It needs Python, OpenCV and Blender and a human in the loop. Keychain Master brings the core of that pipeline into the browser: pick an image, tune the silhouette, get a printable relief and export STL, with live preview.

## What Changes

- Keychain Master mode (replaces the placeholder from `10-product-sections`) with a parameter panel, the shared 3D viewport and the shared export block.
- Image import (PNG/JPEG/WebP/SVG, drag-and-drop or file picker), raster decoded in the browser; the image is kept in IndexedDB so a reload restores the keychain.
- Silhouette stage ported from `01_silhouette.py` to TypeScript: threshold (auto/Otsu + slider, invert), morphological close, hole filling with a per-hole "keep open" choice, speck removal, dilation; a mask preview with numbered holes (the `holes_debug.png` idea) next to the 3D view.
- Relief stage ported from `02_heightfield.py`: Euclidean distance transform → plateau + bevel profile (`hmax`, `edgeWidth`, `pow`), optional spine/groove detail, rim `heightFloor`.
- Scaling: output size is set by the longest side (or width/height) in mm via `LengthField`; the pixel pitch follows from it, and mesh resolution is a separate quality setting with a triangle budget.
- Base plate ("подложка") size: thickness (`baseLayer`) and shape/size of the plate: follow the silhouette with an offset, or rectangle / rounded rectangle / circle with explicit size and a margin around the relief.
- Single-sided relief with a flat back (printable on the bed without supports); STL export.
- Geometry mode `keychain` added to `generate()` and the worker.

## Capabilities

### New Capabilities
- `keychain-image`: image import, persistence and the silhouette (mask) pipeline.
- `keychain-relief`: relief heightfield, scaling, base plate and the resulting solid.

### Modified Capabilities

## Impact

- New `geometry/raster/` (mask ops, EDT, Otsu), `geometry/keychain.ts`, `features/keychain/*`; `model.ts` gets the `keychain` params; image storage helper shared in `app/` or `features/keychain/`.
- Out of scope: relief patterns beyond the base profile (`12-keychain-patterns`), key-ring hole, pins, two-halves split (`13-keychain-mounts`), colour/photo (lithophane) reliefs, vectorisation of the contour, 3MF.
- Depends on: `10-product-sections`.
