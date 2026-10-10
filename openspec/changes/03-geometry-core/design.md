# Design

## Context

`baseplate.ts` mixes constants, profile building, CSG and parameters, and runs on the main thread. Box and Cutout need the same profile pieces plus a lip. See proposal.md.

## Goals / Non-Goals

**Goals:** React-free, test-first geometry package; identical output for current baseplate inputs; non-blocking UI.

**Non-Goals:** the Box/Cutout/Baseplate-specific features themselves; fastener placement (own change).

## Decisions

- **Modules:** `spec.ts` (constants + `GridfinitySpec` with pitch override), `profiles.ts` (`socketPocket`, `binFoot`, `lipProfile(style)`), `thickness.ts` (types, defaults, `validate`), `sizing.ts` (`resolveAxis(size, pitch, align) → {cells, padding, offset}`), `worker.ts`, `model.ts` (`generate(mode, params)` dispatch).
- **Worker:** one module worker owning the manifold WASM instance; main thread sends `{id, mode, params}`, worker replies `{id, mesh}` with transferable typed arrays. The main thread drops replies whose `id` is not the latest. Manifold objects never cross the boundary; STL/3MF export asks the worker for a mesh. Alternative: main-thread generation with `requestIdleCallback` — rejected, large boolean unions block rendering.
- **Cell-first modelling:** build one cell/foot as a `Manifold` and instance it with translations; padding is a separate slab union. This keeps large grids fast.
- **Lip styles:** Default (full stacking lip), Thin (reduced lip), None — expressed as profile data, not branches in mode code.
- **Validation:** pure functions returning `{ok, errors[]}` with message keys for i18n.
- **Regression:** snapshot test of volume and bounding box for the current 2×2 baseplate before refactor; must match after.

## Risks / Trade-offs

- Worker + WASM in Vite needs `?worker` and `?url` handling → verify in dev and build early (first task).
- Hull-based profiles scale radii slightly differently from true offsets → accept; compare volume against tolerance, not equality.
- Padding slab joined to cell block can create sliver faces → overlap by a small epsilon before union.
