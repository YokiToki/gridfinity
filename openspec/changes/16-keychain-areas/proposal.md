# Proposal

## Why

In Keychain Master the enclosed background regions of a silhouette are called "holes" and offer only two choices: fill them solid or keep them open. That wording is wrong for the common case (the regions are often meaningful parts of the design, such as the inside of a letter or an eye), and two states are not enough: a designer often wants such a region lowered or raised to a chosen level, with several different levels in one keychain.

## What Changes

- **Rename:** "hole" becomes **area** everywhere (panel, mask preview labels, warnings, specs, i18n en/ru: "Область"). The numbers on the mask stay stable ids.
- **Per-area mode:** each area has a mode: **Follow relief** (filled, as the default today), **Open** (cut through, as "keep open" today) or **Level** (the area becomes a flat surface at a given height above the plate). The level is set per area in millimetres; any number of areas can have levels, each its own.
- **Level semantics:** a levelled area is solid with a flat top at `plate + level`, with `heightFloor ≤ level`; it has a hard step at its border (no bevel); patterns and detail lines are not applied inside it.
- **Selecting areas:** clicking an area on the mask preview (small or enlarged) selects it in the list and vice versa; a selected area is outlined on the preview. The list keeps one row per area with the mode select and, for Level, a length field with steppers.
- **Bulk action:** "Apply to all areas" sets the mode (and level) of every area at once.
- **Persistence:** stored `keepOpen: number[]` migrates to the new per-area record.

## Capabilities

### New Capabilities

### Modified Capabilities
- `keychain-image`: holes requirement replaced by areas.
- `keychain-relief`: levelled areas in the relief.

## Impact

- `geometry/keychain.ts` (`SilhouetteParams.keepOpen` → `areas`, `buildSilhouette`, `buildGrid` level override), `geometry/raster/components.ts` unchanged (ids stable), `features/keychain/SilhouetteSection.tsx` (area list), `MaskPreview.tsx` (hit testing, selection outline), `migrate.ts`, en/ru strings, tests.
- Out of scope: gradients or slopes inside an area, named shared levels (one level assigned to many areas by reference), areas that are not enclosed background (use the silhouette settings), per-area patterns, per-area colour.
- Depends on: `11-keychain-relief`, `12-keychain-patterns` (both archived), `15-keychain-ui-polish` (the stepper and enlarged preview are reused).
