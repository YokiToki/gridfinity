# Design

## Context

Reference: `~/sandbox/openscad-agent/.claude/skills/blender-relief-model/scripts/01_silhouette.py` and `02_heightfield.py` (numpy/OpenCV/scipy), with parameters recorded in `work/*/heightfield_params.txt`. Proven values for a 70 mm emblem: `hmax 2.0`, `edge_width 6.0`, `pow 0.65`, `groove 0.55`, `spine_amp 0.2`, `height_floor 0.06`, `base_layer 2.0`. The skill's own pitfalls: no sine/noise "interest" (rejected twice), mask is sensitive to over-dilation (kills tips), `height_floor` must stay below `hmax`.

Here geometry is `manifold-3d` in a worker, UI is React; geometry code stays React-free in `src/geometry/`.

## Goals / Non-Goals

**Goals:** feature parity with stages 1–2 in the browser, live preview, single-sided printable relief, precise mm sizing and a configurable base plate.
**Non-Goals:** Blender-grade smoothing (stage 3) beyond a light mesh smoothing option; split/pins/channel (`13`); extra patterns (`12`).

## Decisions

- **Decoding on the main thread, processing in the worker.** `createImageBitmap` + `OffscreenCanvas`/`<canvas>` → `ImageData` (grayscale + alpha) is sent to the worker as a transferable `Uint8ClampedArray`. SVG is rasterised at the working resolution via `<img>` + canvas. The worker owns everything after that so the UI never blocks.
- **Raster toolkit in `geometry/raster/`** (pure TypeScript, no DOM): `otsu`, `threshold`, `morphology` (separable box/disc dilate & erode on `Uint8Array`), `components` (connected-component labelling → hole ids, stable by scan order of the first pixel), `edt` (Felzenszwalb exact Euclidean distance transform, O(n)). Each unit-tested on tiny synthetic masks.
- **Hole ids:** background components not connected to the border, labelled in raster scan order of their first pixel. Ids are therefore stable while the set of holes is unchanged; `keepOpen: number[]` is stored, ids that disappear are dropped silently. (Port of the skill's rule: always refer to raw component ids, never sorted rank.)
- **Heightfield:** `d = edt(mask)` in mm (`d_px * mm_per_px`); `h = hmax * profile(min(d/edgeWidth, 1))` with `profile(t)=t^pow`, clamped to `max(h, heightFloor)`; then `+ baseLayer`. Same formula as the reference so existing tuned parameters transfer. Validation: `heightFloor < hmax`.
- **Mesh from the grid directly** (like `02_heightfield.py`): top surface vertices on a (possibly downsampled) grid, bottom at z = 0, walls along the mask boundary; built as a `Mesh` and passed to `Manifold.ofMesh` (merge + validate) rather than boolean-ing thousands of prisms. Downsampling: choose cell size so triangles ≤ budget (default 400k); the effective cell size is returned in the result so the UI can show it.
- **Base plate:** a `CrossSection` outline (silhouette offset via `CrossSection.offset`, or rect/rounded-rect/circle) extruded by `baseLayer` and unioned with the relief; the relief heightfield is computed without `baseLayer` added when the plate is a separate body, to avoid a double layer. Decision to settle in task 3.1 with a volume test: keep `h + baseLayer` over the silhouette (reference behaviour) and add the plate only outside the silhouette, so inside the silhouette the result equals the reference.
- **Scale:** `mmPerPx = longestSideMm / longestSidePx`; everything else in mm. Silhouette is cropped to its bounding box plus 2 px before scaling so "longest side" means the shape, not the image canvas.
- **Params:** `KeychainParams = {image: {threshold|'auto', invert, close, fillHoles, keepOpen, speck, grow}, size: {mode: 'longest'|'box', ...}, relief: {hmax, edgeWidth, pow, heightFloor}, base: {thickness, shape, offset|size, margin, radius}, quality}`; image bytes are not part of params, they live in IndexedDB keyed by id (same approach and helper as the Cutout STL storage in `08-cutout-mode`; if 08 is not archived yet, the helper is written here and 08 reuses it).
- **UI:** `features/keychain/{KeychainMode,KeychainPanel,ImageSection,SilhouetteSection,ReliefSection,SizeSection,BaseSection,MaskPreview}`; build with `ui/` components and tokens. No artboard exists: mask preview is an `<canvas>` overlay panel in the viewport corner (collapsible) with hole ids drawn on it. Mobile: panel in the existing bottom drawer.
- **Export:** reuse the Baseplate `ExportBlock` pattern (STL, size and volume chip).

## Risks / Trade-offs

- Large masks (4096²) make EDT and meshing slow → cap the working size, run in the worker, debounce like other modes, and drop stale requests (already provided by `modelClient`).
- Direct grid meshing creates stair-stepped walls at low resolution → quality setting plus optional light Laplacian smoothing of the top surface; marching-squares contour refinement is a possible follow-up, not in scope.
- Photos are not handled by this pipeline (the skill says so) → show a hint when the image has many mid-tones, never silently produce a bad relief.
- Memory for big meshes in the worker → budget plus `Manifold.delete()` discipline as in existing builders.
