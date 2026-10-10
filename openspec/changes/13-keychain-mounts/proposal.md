# Proposal

## Why

A keychain needs a way to attach to a ring, and the agent pipeline's strongest part is the physical assembly: split the relief into two halves that print without supports, glue with alignment pins, and hide the ring channel between them (stages 4–6 of `blender-relief-model`). Choosing the ring location was its most error-prone step (verbal corrections drifted), so Keychain Master replaces it with a visual placement tool on a millimetre grid.

## What Changes

- **Ring mount ("крепление под кольцо")** with three styles: through hole in the plate, eyelet lug added outside the silhouette (auto-merged with the plate), and an embedded channel between two halves (needs the split).
- **Placement tool:** a top-view 2D editor over the silhouette with a mm grid and rulers; drag the mount, type exact X/Y, snap to the nearest outline point or grid, and "Suggest" which finds safe anchors automatically (minimum height over the whole hole footprint, like the reference script) and shows rejected spots with the reason.
- **Two-halves mode:** bisect the symmetric relief at its mid plane into top and bottom halves, each with a flat back for printing; export a print sheet (both halves side by side) as one STL, or each half separately.
- **Alignment pins:** N pin holes (auto-placed on robust anchors, movable, same editor) and matching loose pins on the sheet; pin radius, clearance and depth in mm.
- **Fit checks:** every mount feature is verified against the generated solid (minimum wall around holes, channel breaches to open air at the exterior, pins inside the silhouette) with localized warnings.

## Capabilities

### New Capabilities
- `keychain-mounts`: ring mount styles, placement editor and fit checks.
- `keychain-split`: two-halves mode, alignment pins and the print sheet.

### Modified Capabilities

## Impact

- New `geometry/keychainMounts.ts`, `geometry/keychainSplit.ts`, `geometry/anchors.ts` (pure search for safe anchors); `features/keychain/{MountSection,SplitSection,PlacementEditor}`; export block gets halves/sheet options. The relief builder from 11 gets a symmetric (mirrored) variant for two-halves mode.
- Out of scope: multi-piece splits larger than two halves, magnets or screws for the halves (could reuse the Gridfinity fastener presets later), 3MF with colours, automatic ring-size standards beyond a few presets (a ring diameter field and 3 presets are enough).
- Depends on: `11-keychain-relief`. Independent of `12-keychain-patterns`; if 12 is already archived the mounts must keep working with patterns enabled (checked in verification).
