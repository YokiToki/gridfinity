# Proposal

## Why

Box, Baseplate and Cutout all need the same Gridfinity profiles, thickness settings and handling of sizes that are not multiples of 42 mm. Today they live as constants inside `baseplate.ts` and block the UI thread. A shared core avoids three diverging implementations.

## What Changes

- Extract a React-free `geometry/` kernel: Gridfinity spec constants, cell-pocket and bin-foot profile builders, lip profiles (Default / Thin / None), and shared helpers for rounded slabs and patterns.
- Introduce a thickness-settings model (outer wall, inner wall, floor, lip, clearance, tolerance) with spec defaults and validation.
- Introduce a fractional sizing model: size given in units (decimal) or in millimetres, resolved into whole grid cells plus leftover padding with an alignment (start / center / end).
- Run generation in a Web Worker with debounce and cancellation; transfer meshes to the main thread.
- Add geometry validity checks (manifold status, watertight, expected bounding box) as reusable test helpers.

## Capabilities

### New Capabilities
- `gridfinity-geometry`: shared profiles, thickness settings and generation contract for all modes.
- `fractional-sizing`: resolving non-integer footprints into cells and padding.

### Modified Capabilities

## Impact

- Refactors `src/geometry/baseplate.ts`; adds `geometry/{spec,profiles,sizing,thickness}.ts` and a worker entry.
- `App` swaps direct `buildBaseplate` calls for a `useModel` hook backed by the worker.
- Existing baseplate output must remain geometrically identical for integer sizes (regression test).
