# Design

## Context

The reference stages 4–6: bisect at `z=0` (`clear_inner` keeps +Z, `clear_outer` keeps −Z, verified empirically), rotate the bottom half 180° about X (a rotation, not a mirror), search pin anchors ranked by the minimum height over the whole hole footprint, find a safe inward channel anchor from a user-chosen exterior entrance, then hard-verify that the channel breaches to open air with a ray cast from the opposite face. The `mm_grid.png` overlay existed because verbal corrections of the position drifted. Here the same checks become pure geometry/raster functions and the grid becomes an interactive editor.

## Goals / Non-Goals

**Goals:** visual, precise mount placement; supportless two-halves printing; automatic verification instead of trust.
**Non-Goals:** more than two parts, magnets/screws, colour.

## Decisions

- **Symmetric build.** For two-halves mode the heightfield of 11 is evaluated as `±h` about the mid plane, giving one symmetric solid (as in `02_heightfield.py`); the single-sided build is unchanged. Halves come from `Manifold.splitByPlane` at z = 0 (or from building the +h half and mirroring through a rotation); the bottom half is rotated 180° about X and moved to the sheet. A volume test pins the 0.5 % equality.
- **Anchors search** (`geometry/anchors.ts`, pure, on the raster/height grid): for each candidate cell compute the minimum height over the footprint disc using a precomputed min-filter (separable), rank by margin, enforce distance to the silhouette rim and to already chosen anchors; return accepted and rejected-with-reason lists. Grid step is a parameter in mm and is **not** scaled implicitly with the model size; the code warns when the notch width is under 2 grid steps (the reference lesson: a coarse absolute grid breaks narrow notches after downscaling).
- **Positions are stored relative** to the silhouette bbox (0..1) plus a mm view in the UI, so resizing keeps the mount in the same place; pins use the same representation.
- **Channel.** A cylinder from the exterior entrance to the inward anchor, cut across the mating plane of both halves (half depth in each). Breach verification: sample points slightly beyond the exit along the channel axis in the mask grid; the point must be true exterior (connected to the border), not an interior cavity — the reference's pitfall of treating a hole's edge as the exterior is avoided by labelling background components from 11.
- **Eyelet lug.** A `CrossSection` ring (circle minus hole) hulled toward the nearest outline point and unioned with the plate outline before extrusion; guarantees a connected solid by overlapping at least one wall width into the plate.
- **Placement editor.** `PlacementEditor` is an SVG over the mask contour (traced from the mask with marching squares for display only) with grid lines at nice steps for the zoom, rulers in the display unit, pointer-event drag, optional snap to the nearest outline point; shared snapping helpers from `08-cutout-mode` 3.2 are reused if that change is archived, otherwise a small local module is written and 08 can adopt it. Candidate and rejected anchors are drawn with colour and a tooltip reason.
- **Sheet layout.** Top half at the origin, bottom half beside it offset by `maxWidth + gap` (10 mm), loose pins in a row below; a bounding-box overlap test guards it.
- **Fit checks** run on the same data used for generation (no extra boolean needed except the breach test, done on the grid) and return `{feature, kind, actual, required}` objects mapped to `keychain.warning.*` keys.
- **Export.** The export block gets a segmented choice Sheet / Top / Bottom; STL only (3MF is `09`).

## Implementation notes

- **One cut, two halves:** the pin holes and the channel are cut from the top half as symmetric cylinders about the mating plane; the bottom half is `top.mirror(z)` rotated 180° about X, so both halves always carry identical features and the combined volume of the pair is exactly twice the single-sided model.
- **Anchor field:** built from the same heightfield grid as the mesh (`Grid.solid`, `Grid.top`); when the plate is a separate extrusion the grid is rebuilt once with the plate rasterised so spots on the plate are searchable. Grid cells are never rescaled with the model: the "coarse grid" warning fires when a footprint is narrower than two cells.
- **Eyelet lug:** extruded to the plate thickness (so it needs a plate) and joined to the plate by a hull toward a point one wall inside the plate; it is added to the relief before the halves are made, so both halves get it.
- **Channel Suggest** also proposes the nearest exit to the edge (shortest of eight rays inside the material), so one click gives a channel that opens outside.
- **Sheet:** `generate()` returns parts already placed on the sheet (top at the origin, bottom `gap` to its right, loose pins in a row below) and `ModelResult.sheetLayout` tells the export to keep that layout instead of re-arranging for the printer bed.
- **Placement editor:** the contour is traced from the mask preview (`MaskPreview.box` maps preview pixels to millimetres); positions are stored as fractions of the silhouette box with Y up. Dragging is a local draft and the model is rebuilt on release.

## Verification (task 4.2)

Browser, `v_form.jpeg`, 70 × 59 mm, 3 pins, ring channel: Suggest put the channel's inner end at (27.9, 19.3) mm with the nearest exit to the edge, no fit warnings; top and bottom halves 70 × 59.08 × 4 mm, 2120 mm³ each (single-sided 2180.6 minus pins and channel), min z = 0; loose pin 1.6 × 1.6 × 1.6 mm (hole radius 0.9, clearance 0.1, depth 1 per half); print sheet 150 × 70.68 mm, exported as one STL with the same layout. Eyelet: Suggest placed it at the left tip (0.33, 46.8) mm, sheet grew to 158.35 mm. Hole: on this thin emblem no spot keeps the required wall, so Suggest reports it and offers the eyelet (as designed). With lines (12) enabled the geometry tests keep all solids valid. Checking the halves in a slicer for overhangs is left to the user.

## Risks / Trade-offs

- Splitting dense meshes is slower → use the same budget as 11, debounce, and compute fit checks on the grid rather than on the mesh.
- Mounts and patterns (12) interact: a pattern may thin the wall around a hole → fit check uses the final heightfield, and holes are cut after patterns.
- Hand-placed mount near narrow tips can fail margins → Suggest plus warnings, never silent relocation (the reference lesson: locked anchors fail loudly instead of drifting).
