# Proposal

## Why

A tool organiser needs a pocket that follows the real outline of each tool. Today the Cutout mode needs an STL of the tool, which people rarely have, or a rectangle or circle, which wastes space and holds nothing firmly. A photo of the tools lying on a sheet of paper is something everyone can make, and the sheet gives the scale. Tools like tooltrace.ai do this online; here it has to run entirely in the browser, like the rest of the app.

## What Changes

- **"From photo" in the Cutout list**, next to Add and Import, opens a dialog with three steps:
  1. **Photo and paper.** Choose an image (PNG, JPEG or WebP) and the paper: US Letter, A4 or a custom size in mm, portrait or landscape.
  2. **Align.** Four draggable corner handles are placed on the paper corners in the photo. A live preview shows the paper straightened (perspective removed) at true scale.
  3. **Silhouettes.** Objects are found by contrast against the paper. The user can change the sensitivity and the border margin, then picks which silhouettes to keep (click on the image or tick in the list); each shows its size in mm.
- **Create cutouts.** Every kept silhouette becomes a cutout with a new source kind, **Traced outline** (a polygon in mm), with one depth and clearance chosen in the dialog. The silhouettes keep the arrangement they had on the paper, and the bin footprint is fitted to them (the smallest whole number of Gridfinity units that holds them with the wall and margin), so the result is ready to export.
- **Traced outline cutouts** behave like other cutouts: they are listed, moved, rotated, centred, aligned, snapped, hidden, coloured, shown in the top view and in the 3D tool overlay, and their pocket follows the outline grown by the clearance.
- The photo never leaves the device; no network requests are made.

## Capabilities

### New Capabilities
- `cutout-photo-trace`: turning a photo of objects on a sheet of paper into cutouts at true scale.

### Modified Capabilities
- `cutout-model`: a cutout can have a traced outline as its source.

## Impact

- New `geometry/photo/` (homography and warp, paper presets, background-normalised segmentation, outline tracing; React-free), `geometry/cutout.ts` (`OutlineSource`, pocket, tool, bounds, validation), `features/cutout/photo/` (dialog, corner editor, silhouette picker, image decoding reuse from Keychain), `CutoutPanel` entry button, `migrate.ts`, strings in en and ru, tests.
- Reuses `decodeImage`, the raster toolkit (`otsu`, `close`, `labelComponents`, `removeSpecks`, `fillHoles`), `traceAlpha`/`simplifyLoop` and `fitFootprint`.
- Out of scope: automatic detection of the paper corners, lens-distortion correction, multiple photos in one run, separating touching tools automatically, 3D reconstruction or depth from a photo, a hole or lid for an object. The silhouette is the visible top outline: a tall object photographed from the side or at an angle looks bigger than it is (parallax), so the dialog tells the user to shoot straight down and the clearance setting absorbs the rest.
- Depends on: `08-cutout-mode`, `11-keychain-relief`, `23-cutout-circle` (union of sources), `24-cutout-colors` (new cutouts get colours through the same rule).
