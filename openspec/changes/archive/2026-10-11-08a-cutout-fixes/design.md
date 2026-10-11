# Design

## True 3D = the part as it is

The first version made the pocket a stepped swept volume (cumulative projections per 0.5 mm slab). In use it left visible layers and did not match the part. Now a valid solid is cut as it is: the oriented part, standing on the pocket floor, minus nothing added. Clearance is the Minkowski sum of the part with a small 12-segment sphere of radius = clearance (exact in the axis directions), trimmed at the floor so the pocket never gets deeper than set; parts above 40 000 triangles use the previous scaling to keep build time down. Above the part the pocket is extended to the top face by the part's silhouette (`project()`), as before.

## Closing meshes that are not watertight

First the surface is healed: `Mesh.merge()` welds gaps within tolerance and `fillHoles` closes every boundary loop with a fan from its centre; most STL files with holes then become valid solids and take the exact path above. Only if that still fails:

`toManifold` fails for open meshes today and the hull fallback is used. Replace by a slicer on the raw triangles: for every slab level compute the intersection segments of the triangle soup with the plane, chain them into polylines, and fill them as polygons with the non-zero / even-odd rule (`CrossSection.ofPolygons` with the fill rule). Gaps smaller than a weld tolerance (0.05 mm) are closed by snapping the segment endpoints. The same cumulative-projection rule is then applied (union of the sections of all lower slices). If no loop can be closed on any level, fall back to the convex hull as before and keep the existing warning.

Valid solids never use this path: they are cut exactly. The stepped profile (and its cache) exists only for meshes that are not valid solids, where no exact volume exists.

## Tool preview

`ModelResult` gets `tools: ToolMesh[]` (`id`, `name`, `mesh`). `generate('cutout')` builds one body per visible cutout: for a rectangle the rounded rectangle extruded to the effective depth, for a mesh the part's own triangles after orientation, rotation and shift (no Manifold step, so open meshes show as they are; no clearance, so the user sees the gap to the pocket wall). The viewport shades it smooth with creased normals (30°). Bodies are separate meshes: they never enter `parts`, `modelBounds`, the volume readout or the export. `Viewport` draws them with a translucent material (cyan, `opacity 0.45`, `depthWrite: false`, no edge lines), above the main model in the render order, and a toolbar toggle (persisted via `usePersistedState`, default on) hides them.

## Risks

- Slab count versus build time: a dense mesh trimmed 48 times can take seconds; slices are cached per mesh+orientation and the existing debounce/latest-wins applies. The slab count is reduced for parts higher than 24 mm to keep ≥ 0.5 mm layers, capped at 48.
- The cumulative projection only widens the pocket towards the top, which is what insertion requires; a part that is wider at the bottom than at the top keeps its wide bottom.
