# Proposal

## Why

With several cutouts it is hard to tell which pocket is which: in the top view every shape is the same grey, in the 3D view every translucent tool is the same cyan, and the list shows only names. The user has to click each row to find a shape. Giving every cutout its own colour, shown identically in the list, the top view and the 3D view, makes the correspondence visible at a glance.

## What Changes

- **A colour per cutout.** Each cutout gets a colour from a fixed palette of 7 distinguishable hues when it is added (the first colour not used by the current cutouts, cycling when all are used). The colour is stored with the cutout, so reordering or deleting other cutouts never recolours it, and a duplicate gets its own colour.
- **List.** A small colour swatch at the start of each row.
- **Top view.** Each shape is filled and outlined in its own colour; the selected shape keeps a stronger fill and the dashed accent box.
- **3D view.** The translucent tool of each cutout uses its colour instead of the single cyan.
- **Stored data.** Sessions saved without colours get colours by list order on load.
- Colours are never part of the exported STL or 3MF (tools are preview only, as before).

## Capabilities

### New Capabilities

### Modified Capabilities
- `cutout-model`: cutouts have a colour that is stable and distinct.
- `model-viewport`: the cutting tool overlay shows each tool in its cutout's colour.

## Impact

- `geometry/cutout.ts` (`Cutout.color`, colour assignment in `addCutout`/`duplicateCutout`), `ModelResult.tools` (carries the colour index), `features/cutout/{CutoutPanel,TopView,migrate}`, `features/viewport/Viewport.tsx` (tool colour), palette tokens in `app/theme.css`, strings in en and ru, tests.
- Out of scope: choosing a colour by hand, colours in exported files, colouring the bin itself, colour for the keychain or other modes.
- Depends on: `08-cutout-mode`, `23-cutout-circle` (the circle factory must assign a colour like the rectangle).
