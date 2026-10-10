# Proposal

## Why

With magnets or screws enabled, the baseplate gets a solid 4 mm floor under every cell, which wastes a lot of material and print time. Only the material around each hole is needed. Free-form manual placement is more than is needed: ears only make sense at the standard cell-corner positions. A mode label also does not fit in its segmented control.

## What Changes

- Replace the full floor under fasteners with local "ears": raised pads around each hole that merge into the cell walls. The rest of each cell stays open, like a baseplate without fasteners. A cell without holes (Corner mode) is fully open.
- Add an ear wall setting (material around a hole, 1.2 mm by default).
- **BREAKING** Narrow Manual placement to choosing which standard cell-corner positions get a hole and ear. Free placement, dragging, the coordinate list and the "Add hole" button go away. The selection is stored per cell corner instead of as coordinates; stored coordinates snap to the nearest standard position within 3 mm and the rest are dropped.
- Fix the placement segmented control so labels such as "В каждой ячейке" are never clipped (shorter labels, wrapping where needed).
- Keep the footprint helpers, which Cutout will reuse.

## Capabilities

### New Capabilities

### Modified Capabilities
- `fastener-placement`: holes get ears instead of a full floor; Manual only toggles standard cell-corner positions; stored manual data migrates by snapping.
- `app-shell`: shared controls must show long labels without clipping.

## Impact

- `geometry/fasteners.ts`, `geometry/profiles.ts` (cell window), `geometry/baseplate.ts`, `features/fasteners/` (simplify `PlacementEditor`, trim `placement.ts`), `features/baseplate/migrate.ts`, `ui/SegmentedControl.tsx`, i18n files.
- Reconcile `05-baseplate-model`, which assumes a floor that is raised when fasteners are on, with ears (artifact edit only).
- Out of scope: ear shape options, free hole coordinates, structural analysis of thin walls, and any change to the no-fastener baseplate geometry.
- Depends on: `04-fastener-placement` (archived), `03-geometry-core`, `01-app-foundation`.
