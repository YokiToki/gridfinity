# Design

## Context

`buildBaseplate` now subtracts a cell pocket that starts at `floor` (4 mm when any hole exists) from a block of height `floor + 4.65`. Under the pocket the block is solid, so every cell gets a full floor. The magnet pocket reaches from the pocket bottom 2.4 mm down; the screw hole goes through. `fastenerCuts` returns hole cutters and positions; the `manual` mode stores free coordinates edited in `PlacementEditor` (click, drag, coordinate list). See proposal.md.

## Goals / Non-Goals

**Goals:** material only around holes; the same overall height (8.65 mm) so existing fits do not change; no change to the no-fastener baseplate; Manual reduced to choosing standard positions, with a safe migration.

**Non-Goals:** other ear shapes, free hole coordinates, strength simulation, changing the pocket profile.

## Decisions

- **Cell window:** below the pocket bottom (z from the underside up to `floor`) each cell is cut open with a rounded outline equal to the pocket's bottom outline (the lowest profile layer), so the wall is continuous with the pocket. New helper `socketWindow(w, pitch)` in `profiles.ts`. Alternative: leave the floor and thin it — rejected, it does not remove the material.
- **Ear shape:** the hull of a disc around the hole (radius = hole radius + ear wall) and the same disc moved to the nearest cell-window corner, so the ear merges into the walls. It is subtracted from the window cutter before the cut, so the ears stay as material. Hole cutters then go through the ears as today. With fractional footprints holes sit on full cells only, so ears do too.
- **Where ears apply:** per cell, for positions in that cell only. A cell with no holes gets an open window. Corner mode therefore yields four ears on a 2×2 plate.
- **Ear wall setting:** `earWall` (mm, default 1.2, range 0.4–4) lives in `FastenerConfig`, shown in `FastenerSection`. A check warns when the ear radius exceeds the window half-width; the geometry is still built.
- **Ear height = floor:** the ears top at `FLOOR` (4 mm), the same as the pocket bottom, so total height stays 8.65 mm. Screw heads and magnets keep their current depths.
- **Manual as a selection of slots:** replace `manual: Point[]` with `slots: Slot[]`, where `Slot = { i, j, sx, sy }` is a cell index pair plus a corner (`sx`, `sy` ∈ {−1, +1}); the position is the cell centre plus `(sx, sy) × 13 mm`. Slots on cells that no longer exist are ignored (and pruned when the kind is edited), so changing the grid size keeps the rest. Alternative: keep coordinates and snap on every render — rejected, positions would shift when the grid is resized.
- **Switching to Manual** always starts empty, from any mode: no slots are selected until the user toggles them. Switching to None, Corner or Full leaves the stored slots untouched, so a selection comes back when the user returns to Manual.
- **Editor:** `PlacementEditor` keeps the SVG grid but only shows the standard positions as toggle buttons (`role="switch"`, `aria-pressed`, focusable, Enter/Space) with labels such as "Cell 2,1, top right". Dragging, free click-to-add, the coordinate list and the "Add hole" button are removed, along with `snapPoint`, `clampToFootprint`, `togglePoint` and `toCorner/fromCorner` in `placement.ts`. The magnet/screw switcher stays when both kinds are Manual.
- **Migration:** old stored `manual` points are mapped to the nearest standard position of the stored grid within 3 mm (`SNAP_RADIUS`); duplicates collapse; points farther away are dropped. The grid is computed from the stored `x`, `y`, `unit` and size, with defaults for missing values. The boolean migration is unchanged.
- **Segmented labels:** the control's segments get `min-w-0`, `whitespace-normal`, `leading-tight` and shorter labels for the placement control (en: None, Corners, All cells; ru: Нет, Углы, Все ячейки). Wrapping into two lines is the fallback, not the default.

## Risks / Trade-offs

- Thin ear-to-wall joints may be weak on small cells → default ear wall 1.2 mm and a warning; the user can raise it.
- The window cut changes mesh topology with fasteners → covered by volume/bbox tests and `expectValidSolid`.
- 05-baseplate-model assumes a raised floor with fasteners → its artifacts are reconciled in this change's last section.
