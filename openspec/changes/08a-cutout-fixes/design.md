# Design

## True 3D = swept volume

A part is placed into a pocket by lowering it vertically. The pocket therefore has to contain the swept volume of the part, not just the part. For the part `P` standing on the pocket floor, at height `z` the pocket section is

`S(z) = project( P ∩ {z' ≤ z} )`

i.e. the projection of the lower portion of the part. Above the top of the part the section stays `S(top)` up to the top of the bin. This is a monotone "closing" of undercuts: overhangs are filled upward, nothing below a feature is left solid that the feature would have to pass through.

Implementation: cut the oriented manifold into `N` slabs along Z (`N = clamp(ceil(height / 0.5), 8, 48)`; slab edges are rounded up so the pocket is never smaller than the part), for slab `k` take `trimByPlane` (keep `z' ≤ top_k`), `project()`, offset by the clearance (round joins), extrude through the slab. The union of the slabs is the pocket. Walls are stepped by at most 0.5 mm in height, which is below the print layer resolution of most settings and far less visible than the previous failure. Slices are cached per oriented mesh (`oriented` cache already exists), only the offset/placement is applied per cutout.

Clearance applies in XY only: the part rests on the pocket floor, so the floor stays at the resting plane as before.

## Closing meshes that are not watertight

`toManifold` fails for open meshes today and the hull fallback is used. Replace by a slicer on the raw triangles: for every slab level compute the intersection segments of the triangle soup with the plane, chain them into polylines, and fill them as polygons with the non-zero / even-odd rule (`CrossSection.ofPolygons` with the fill rule). Gaps smaller than a weld tolerance (0.05 mm) are closed by snapping the segment endpoints. The same cumulative-projection rule is then applied (union of the sections of all lower slices). If no loop can be closed on any level, fall back to the convex hull as before and keep the existing warning.

Valid solids keep using the exact path (trim + project), which is faster and more precise.

## Tool preview

`ModelResult` gets `tools: ToolMesh[]` (`id`, `name`, `mesh`). `generate('cutout')` builds one body per visible cutout: for a rectangle the rounded rectangle extruded to the effective depth, for a mesh the oriented part at its resting position (nominal size, no clearance, so the user sees the clearance gap between the tool and the pocket wall). Bodies are separate meshes: they never enter `parts`, `modelBounds`, the volume readout or the export. `Viewport` draws them with a translucent material (cyan, `opacity 0.45`, `depthWrite: false`, no edge lines), above the main model in the render order, and a toolbar toggle (persisted via `usePersistedState`, default on) hides them.

## Risks

- Slab count versus build time: a dense mesh trimmed 48 times can take seconds; slices are cached per mesh+orientation and the existing debounce/latest-wins applies. The slab count is reduced for parts higher than 24 mm to keep ≥ 0.5 mm layers, capped at 48.
- The cumulative projection only widens the pocket towards the top, which is what insertion requires; a part that is wider at the bottom than at the top keeps its wide bottom.
