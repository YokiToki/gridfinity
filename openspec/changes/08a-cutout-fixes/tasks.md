# Tasks

## 1. True 3D pocket

- [ ] 1.1 In `geometry/cutout.ts` replace the 3D branch of `pocketSolid` with the swept pocket: slab sections `project(trimByPlane(P, z))` cumulative upward, offset by the clearance in XY, union of extruded slabs, open above the part. Tests with a stepped part and a T/L-shaped part: the section at every height contains the part's section; a point under the overhang is empty; bounding box and `expectValidSolid`; clearance grows every section by `clearance`.
- [ ] 1.2 Cache the per-slab sections per oriented mesh (key as in `orientedManifold`) and cap the slab count; test that a dense part builds in a reasonable time and that repeated builds reuse the cache.

## 2. Meshes that are not watertight

- [ ] 2.1 In `geometry/stl-import.ts` add `sliceLoops(mesh, z, weld)` (plane–triangle segments chained into closed loops, endpoints snapped within 0.05 mm). Tests: closed box gives one rectangle; a box with a missing triangle still closes; a plane above the part gives no loops.
- [ ] 2.2 Use the slicer in `pocketSolid` when `toManifold` fails: build the cumulative sections from the loops for both projected and 3D modes, fall back to the convex hull only when no loop closes; keep the existing import warning and add the “closed from sections” variant (en + ru). Test with an open mesh: pocket area equals the part outline, not the hull (use a concave part).

## 3. Tool overlay

- [ ] 3.1 Add `tools: ToolMesh[]` to `ModelResult` in `geometry/model.ts` and build the tool bodies in `generate('cutout')` (rectangle extruded to the effective depth, mesh oriented at its resting position, no clearance); `modelBounds`, the volume readout and export ignore them. Tests: tool count equals visible cutouts, hidden ones are absent, bounds and exported STL are unchanged.
- [ ] 3.2 In `Viewport.tsx` draw `tools` with a translucent cyan material (no edges, `depthWrite: false`) and add a toggle button to the viewport toolbar (persisted, default on) with en and ru labels. Component test with the viewport mocked; browser check (Cutout, rectangle and imported part, en and ru): the body is visible in its pocket, moves when the cutout is dragged, hides with the toggle. No artboard exists for this toggle: build it from the existing toolbar buttons and say so in the commit.
- [ ] 3.3 Update the 3D mode hint in `CutoutPanel` (en + ru): the pocket is closed upward so the part can be lowered in.

## 4. Verification

- [ ] 4.1 `npm test` and `npm run build` pass; in the browser import the test “T” part, set 3D mode, check that the pocket follows the T at different heights and no material remains under its overhang (section view of the exported STL via bbox/volume), and the console has no errors.
