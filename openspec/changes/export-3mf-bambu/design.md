# Design

## Context

Only a binary STL exporter exists. Meshes come from the geometry worker as typed arrays. See proposal.md.

## Goals / Non-Goals

**Goals:** correct multi-part 3MF; Bambu-ready metadata; no network.

**Non-Goals:** other slicers' proprietary metadata, G-code generation, uploading to cloud.

## Decisions

- **Zip:** `fflate` for ZIP creation (small, no deps); 3MF layout `[Content_Types].xml`, `_rels/.rels`, `3D/3dmodel.model`, plus `Metadata/*` for Bambu.
- **Mesh source:** worker returns meshes; the exporter works on typed arrays and never touches Manifold, so it stays testable and fast.
- **Arrangement:** simple shelf packing of part footprints inside the bed minus margin, with multiple plates when needed; a pure function with table tests.
- **Bambu metadata:** a minimal `Metadata/project_settings.config` and `model_settings.config` with printer, nozzle, process and filament selections. Exact key names must be checked against a project saved by the current Bambu Studio version (first task), because the format is undocumented and version dependent.
- **Printer data:** `data/printers.ts` typed list written from vendors' published specs; no copying from third-party AGPL preset dumps (the reference open-source project marks its snapshot AGPL-3.0).
- **Orientation:** default rule — models with a smooth top/lip are flipped so the flat base prints on the bed; baseplates print as-is; per-model override in the dialog.

## Risks / Trade-offs

- Bambu Studio project format changes between versions → isolate in `bambu.ts`, keep a plain 3MF fallback, and document the tested Studio version.
- Bed sizes for newer printers may be wrong → cite sources in the data file and allow custom sizes.
- Large meshes make big ZIPs → compress with deflate; export runs in the worker if it exceeds a size threshold.
