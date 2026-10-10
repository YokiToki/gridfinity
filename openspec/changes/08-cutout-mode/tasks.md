# Tasks

## 1. Base and primitives

- [x] 1.1 Extract/confirm shared `bin` shell builder used by Box; Box tests unchanged and green.
- [x] 1.2 Cutout params + solid-interior bin; test solid block volume and bbox for 2×2×3.
- [x] 1.3 Rectangle primitive with radius, depth and clearance; tests: pocket size 60×20 (+clearance) and depth limit.
- [x] 1.4 Cutout list model (add/duplicate/reorder/hide/delete) with persistence; unit tests for each action.

## 2. STL import

- [x] 2.1 STL parser (binary + ASCII) with tests on fixture files incl. invalid input.
- [x] 2.2 Mesh welding/repair and `Manifold.ofMesh`; test open-by-duplicates mesh becomes valid.
- [x] 2.3 Import unit, rotation and lay-flat orientation; tests for inch scaling and face-down rotation.
- [x] 2.4 Projected and true-3D cutting modes; tests compare pocket outline with source projection.
- [ ] 2.5 IndexedDB storage for imported meshes with in-memory fallback; test round trip and fallback.

## 3. Placement

- [x] 3.1 Pure alignment helpers (centre, align edge with margin, distribute, fit footprint); table tests.
- [x] 3.2 Snapping utilities shared with the fastener editor; tests for centre, edge and grid snapping.
- [ ] 3.3 2D top-view editor with drag, numeric fields, guides; component tests for drag and numeric entry. Design: `design/artboards/Cutout.dc.html`.

## 4. UI

- [ ] 4.1 `CutoutPanel` sections and cutout list with en/ru strings; render tests. Design: `design/artboards/Cutout.dc.html`.
- [ ] 4.2 Warnings for wall margins and overlaps; component test for the edge warning.
- [ ] 4.3 Verify in the browser: import a sample STL, lay flat, centre, export STL and check the pocket exists.
