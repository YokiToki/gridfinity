# Proposal

## Why

With magnets or screws enabled, the baseplate gets a solid 4 mm floor under every cell, which wastes a lot of material and print time. Only the material around each hole is needed. Manual hole placement turned out to be unnecessary for now and complicates the model, and a mode label does not fit in its segmented control.

## What Changes

- Replace the full floor under fasteners with local "ears": raised pads around each hole that merge into the cell walls. The rest of each cell stays open, like a baseplate without fasteners. A cell without holes (Corner mode) is fully open.
- Add an ear wall setting (material around a hole, 1.2 mm by default).
- **BREAKING** Remove Manual placement: the `manual` mode, the 2D placement editor and its coordinate list. Stored manual placements load as Full.
- Fix the placement segmented control so labels such as "В каждой ячейке" are never clipped (shorter labels, wrapping where needed).
- Keep the footprint and snapping helpers, which Cutout will reuse.

## Capabilities

### New Capabilities

### Modified Capabilities
- `fastener-placement`: modes are None, Corner and Full; holes get ears instead of a full floor; manual placement is removed; stored manual data migrates to Full.
- `app-shell`: shared controls must show long labels without clipping.

## Impact

- `geometry/fasteners.ts`, `geometry/profiles.ts` (cell window), `geometry/baseplate.ts`, `features/fasteners/` (delete `PlacementEditor`, `placement.ts`), `features/baseplate/migrate.ts`, `ui/SegmentedControl.tsx`, i18n files.
- Reconcile `05-baseplate-model`, which assumes a floor that is raised when fasteners are on, with ears (artifact edit only).
- Out of scope: ear shape options, per-cell ear editing, structural analysis of thin walls, and any change to the no-fastener baseplate geometry.
- Depends on: `04-fastener-placement` (archived), `03-geometry-core`, `01-app-foundation`.
