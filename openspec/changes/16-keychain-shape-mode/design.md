# Design

## Context

`10-product-sections` made products with optional modes (`PRODUCTS`, `ModeChooser`, header mode switcher, `/gridfinity/<mode>` routes). Keychain Master is one `KeychainMode` at `/keychain` with one saved state `keychain.relief` that includes the image id, silhouette settings and the rest. The pipeline is image → `buildSilhouette` → crop/resample to a grid → heights; mounts and the editor consume the grid and the mask preview.

## Decisions

- **Registry and routes:** `PRODUCTS.keychain.modes = [{id: 'image', path: '/keychain/image'}, {id: 'shape', path: '/keychain/shape'}]`; `/keychain` renders the generalised mode chooser (the Gridfinity one parameterised by product: cards, number hotkeys, art), unknown `/keychain/*` goes back to `/keychain`. Mode labels move from `modes.<id>` to `<product>.modes.<id>` keys so Gridfinity's Box/Baseplate/Cutout and Keychain's Image/Shape do not collide; the header switcher and mobile select read the product's modes. Old links to `#/keychain` land on the chooser; the "Continue" chip goes straight to the last mode (`lastSession` already stores `product` and `mode`; its `mode` type widens to a string).
- **Shared workspace, two modes:** `KeychainWorkspace({origin})` holds what is common (state hook per key, `useKeychainModel`, `Workspace`, export footer, session recording); `ImageMode` supplies the image store/decoding/drop zone and the image-only sections, `ShapeMode` supplies the shape section. The shared sections (`ProfileSection`, `DetailSection`, `PatternSection`, `BaseSection`, `MountSection`, `SplitSection`, `QualitySection`, size where it applies) are used by both panels unchanged; the panel composes them from a list per mode.
- **Params:** `KeychainParams.origin: { kind: 'image' } | { kind: 'shape'; shape: ShapeParams }`. For shapes `imageId`, `silhouette` and `source.kind` are ignored (validation does not require them) and `size` is derived from the shape's own width × height; the Shape mode state key does not store image fields at all. `ShapeParams = { kind: 'rect' | 'circle' | 'ellipse' | 'capsule' | 'polygon'; width; height; radius; sides; rotation; rim: { enabled; width; height } }`.
- **Smooth outline:** the grid step must not decide how round a corner is. A shape is rasterised with a margin (1.75 cells) around the true outline, the relief mesh is intersected with the exact outline (`shapeCrossSection`, 256 segments per full circle) and the plate for a silhouette-shaped base is that exact outline offset; distances to the edge are measured from the true edge (`edgeShift`). Mount fields use the unpadded mask. When a pattern on the base puts the plate into the grid the old stepped path is used.
- **Rasterising:** a shape is rendered analytically into a mask at 2048 px along the longest side (inside tests: rounded-rectangle distance, ellipse equation, capsule = segment distance ≤ r, regular polygon with optional corner rounding by offsetting) and fed to the same grid code as an image mask, bypassing thresholding, closing and areas. The grid fit makes the blocks span exactly the shape's size: for a sharp rectangle the bounding box equals width × height within 0.05 mm.
- **Rim:** a node whose distance to the edge is below `rim.width` gets `h += rim.height` after the profile and before patterns (patterns may cut the rim; the minimum-height clamp still holds); with the engraved profile the rim is the ring left at full height. It lives in `ShapeParams`, the image path never reads it.
- **Preview for the editor:** the worker still returns a small preview mask for shapes, but only the placement editor uses it (contour tracing); the mask card is not rendered in Shape mode. The editor therefore needs no shape-specific code beyond hiding the card.
- **Shape defaults:** profile Flat, hmax 1.0, heightFloor 0.06, plate thickness 1.6, rim off, distance height source only (the brightness source needs an image).
- **UI:** `ShapeSection` has thumbnails for the kinds, `LengthField`s (with steppers from `15`) for the sizes, the corner radius clamped to half of the shorter side and shown as the effective value, sides and rotation for the polygon, and a presets select; `RimSection` is inside it. Mobile: the same sections in the drawer.
- **Migration:** existing `keychain.relief` records belong to the Image mode unchanged; the Shape mode starts from defaults. Nothing is moved or copied between modes.
- **Names:** export file `keychain_<w>x<h>` as before; session text uses the shape size.

## Risks / Trade-offs

- Two entry points to the same product: the header switcher and the chooser both exist, as in Gridfinity; tests cover routes, redirects of unknown paths and the "Continue" chip.
- A 2048 px mask of a 100 mm shape has 0.05 mm pixels, finer than the grid, so edge quality is limited by the grid step, not by the mask.
- Rounded polygon corners via offsetting can differ slightly from CAD fillets at very small radii; the radius has a minimum of one grid cell.
