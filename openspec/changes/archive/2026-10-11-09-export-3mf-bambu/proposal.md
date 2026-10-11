# Proposal

## Why

STL carries only one mesh with no print settings. A 3MF export holds several named parts (split baseplates) and, for Bambu Studio, can carry process/filament presets and print orientation so models open ready to slice. The reference studio does this for Bambu printers; the same convenience is wanted here.

## What Changes

- Export dialog with format choice: STL (single or per part) and 3MF.
- 3MF export containing all parts with names, positions on a virtual plate (arranged within the bed) and orientation.
- Bambu Studio project metadata: selected printer model, 0.4 mm nozzle, process preset (e.g. 0.20 mm Standard), filament preset (PLA), print orientation (flip smooth-top / lip-down models so the flat side is on the bed).
- Printer preset list with bed sizes for common Bambu models (A1 mini, A1, P1P/P1S, X1C/X1E, H2D, H2S), selectable in the app and driving the build plate and split limits; custom bed size remains possible.
- Persist the selected printer and export options.

## Capabilities

### New Capabilities
- `model-export`: STL and 3MF file export of generated models.
- `printer-profiles`: printer presets and Bambu Studio project metadata.

### Modified Capabilities

## Impact

- New `export/{stl,threemf,bambu}.ts`, `features/export/ExportDialog.tsx`, `data/printers.ts`.
- Depends on all generator modes; touches the build-plate preview and split source of build volume.
- Bambu preset data must be written from public specs, not copied from third-party AGPL files.
