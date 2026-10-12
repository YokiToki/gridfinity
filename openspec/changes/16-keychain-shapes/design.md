# Design

## Context

The pipeline is image → `buildSilhouette` (mask at image resolution) → crop/resample to a grid → distance field → heights. Mounts (`anchors.ts`) and the editor consume the grid and the mask preview, not the image.

## Decisions

- **Params:** `KeychainParams.origin: { kind: 'image' | 'shape'; shape: ShapeParams }`, where `ShapeParams = { kind: 'rect' | 'circle' | 'ellipse' | 'capsule' | 'polygon'; width, height, radius, sides, rotation }`. `imageId` and the silhouette block stay for the image side. `size.mode` is ignored for shapes (the shape's own width × height are the size, so "longest side" scaling does not apply).
- **Rasterising:** a shape is rendered analytically into a mask at a working resolution of 2048 px along the longest side (inside tests per shape: rounded-rectangle distance, ellipse equation, capsule = segment distance ≤ r, regular polygon with optional corner rounding by offsetting). The rest of the pipeline receives a `GrayImage`-equivalent (`mask`, bounds) and skips thresholding/closing/holes. A shape has no areas.
- **Exact size:** the grid fit used for images (blocks span exactly the requested size) applies; for a rectangle with sharp corners the bounding box equals width × height within 0.05 mm.
- **Rim:** `RimParams = { enabled, width, height }` lives in `ShapeParams` (shapes only; the image path never sees it); in `buildGrid` a node whose distance to the edge is below `width` gets `h += height` after the profile and before patterns (patterns may cut the rim; the minimum-height clamp still holds). For the engraved profile the rim is the ring left at full height. The rim is part of the heightfield, so the plate and mounts see it; anchors treat rim height as part of `top`.
- **UI:** the empty state shows two large choices (Image / Shape) built from the existing start-card style; `OriginSection` at the top of the panel is a segmented control; `ShapeSection` has thumbnails for the kinds, `LengthField`s for the sizes, a corner radius field (clamped to half the shorter side, shown as effective value), sides for the polygon and presets as a select. `RimSection` is part of `ShapeSection` and is not shown for the image origin. Mobile: the same sections in the drawer.
- **Defaults for shapes:** profile Flat, hmax 1.0, heightFloor 0.06, plate thickness 1.6, rim off; chosen so a new shape gives a printable tag at once. Switching the origin does not overwrite the user's relief settings: shape defaults apply only when the origin is first switched to Shape on a fresh record.
- **Export name and recent list:** `keychain_<w>x<h>` as before; `lastSession` size text uses the shape size.

## Risks / Trade-offs

- A 2048 px mask of a 100 mm shape has 0.05 mm pixels, finer than the grid; edge quality is limited by the grid step (documented), not by the mask.
- Rounded polygon corners via offsetting can look slightly different from CAD fillets at very small radii; limited to a minimum radius of one grid cell.
