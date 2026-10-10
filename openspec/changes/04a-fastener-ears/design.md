# Design

## Context

`buildBaseplate` now subtracts a cell pocket that starts at `floor` (4 mm when any hole exists) from a block of height `floor + 4.65`. Under the pocket the block is solid, so every cell gets a full floor. The magnet pocket reaches from the pocket bottom 2.4 mm down; the screw hole goes through. `fastenerCuts` returns hole cutters and positions; `PlacementEditor` and the `manual` mode sit on top of that. See proposal.md.

## Goals / Non-Goals

**Goals:** material only around holes; the same overall height (8.65 mm) so existing fits do not change; no change to the no-fastener baseplate; removal of Manual with a safe migration.

**Non-Goals:** other ear shapes, ear editing, strength simulation, changing the pocket profile.

## Decisions

- **Cell window:** below the pocket bottom (z from the underside up to `floor`) each cell is cut open with a rounded outline equal to the pocket's bottom outline (the lowest profile layer), so the wall is continuous with the pocket. New helper `socketWindow(w, pitch)` in `profiles.ts`. Alternative: leave the floor and thin it — rejected, it does not remove the material.
- **Ear shape:** the hull of a disc around the hole (radius = hole radius + ear wall) and the same disc moved to the nearest cell-window corner, so the ear merges into the walls. It is subtracted from the window cutter before the cut, so the ears stay as material. Hole cutters then go through the ears as today. With fractional footprints holes sit on full cells only, so ears do too.
- **Where ears apply:** per cell, for positions in that cell only. A cell with no holes gets an open window. Corner mode therefore yields four ears on a 2×2 plate.
- **Ear wall setting:** `earWall` (mm, default 1.2, range 0.4–4) lives in `FastenerConfig`, shown in `FastenerSection`. A check warns when the ear radius exceeds the window half-width; the geometry is still built.
- **Ear height = floor:** the ears top at `FLOOR` (4 mm), the same as the pocket bottom, so total height stays 8.65 mm. Screw heads and magnets keep their current depths.
- **Removing Manual:** drop `'manual'` from `FastenerMode`, the `manual` arrays, `switchMode`, `PlacementEditor`, `placement.ts`, related i18n keys and tests. Footprint helpers stay. Migration: any kind stored as `manual` becomes `full`; the boolean migration is unchanged. Alternative: keep the data model and hide the UI — rejected, dead code and states that cannot be reached.
- **Segmented labels:** the control's segments get `min-w-0`, `whitespace-normal`, `leading-tight` and shorter labels for the placement control (en: None, Corners, All cells; ru: Нет, Углы, Все ячейки). Wrapping into two lines is the fallback, not the default.

## Risks / Trade-offs

- Thin ear-to-wall joints may be weak on small cells → default ear wall 1.2 mm and a warning; the user can raise it.
- The window cut changes mesh topology with fasteners → covered by volume/bbox tests and `expectValidSolid`.
- 05-baseplate-model assumes a raised floor with fasteners → its artifacts are reconciled in this change's last section.
