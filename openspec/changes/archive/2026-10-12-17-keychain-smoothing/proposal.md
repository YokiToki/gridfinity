# Proposal

## Why

With the brightness height source the relief follows every pixel of the picture, so a photo gives a grainy, stair-stepped surface (JPEG noise, 0.25 mm grid steps) and a rough print. There is no smoothing control anywhere in Keychain Master, so it cannot be fixed. The original design also listed an optional light smoothing as "not done".

## What Changes

- **Smoothing of the picture before it becomes height (brightness source; Image mode only, as Shape mode has no picture):** a Gaussian blur of the brightness plane with a radius in millimetres, applied before contrast and gamma. Default 0.4 mm when the brightness source is chosen, 0 mm to switch it off. Removes JPEG grain and pixel noise without touching the silhouette.
- **Despeckle (brightness source):** an optional median filter (off by default, 3 × 3 cells) that removes isolated bright/dark pixels before blurring.
- **Smoothing of the relief surface (any source):** an optional radius in millimetres (0–3, default 0 = off) that softens stair-steps and sharp creases of the finished height field, including terraced and distance profiles. It is applied before detail lines, patterns, text and area levels, so those stay crisp, and never changes the silhouette outline, the minimum rim height or the base plate thickness.
- **Edge preserving:** smoothing does not cross the silhouette border (heights outside the silhouette do not leak in), and the rim height stays at least the minimum.
- Live preview: the controls sit next to the height source; changing them rebuilds the model like any other relief setting.

## Capabilities

### New Capabilities
- `relief-smoothing`: smoothing of the height source and of the relief surface.

### Modified Capabilities

## Impact

- `geometry/keychain.ts` (`SourceParams.smooth`, `despeckle`; `ReliefParams.smooth`), new `geometry/raster/blur.ts` (separable Gaussian and 3×3 median on typed arrays with a mask), `features/keychain/ProfileSection.tsx`, migrate (defaults: old records keep identical output, i.e. 0 for existing brightness keychains), en/ru strings, tests.
- Out of scope: mesh-level Laplacian smoothing of the exported triangles, edge-preserving bilateral filters, anisotropic smoothing, smoothing of the silhouette outline (use Close and Grow for that).
- Depends on: `12-keychain-patterns` (archived), `15-keychain-ui-polish`. The surface smoothing is shared by both Keychain modes; the brightness smoothing exists only in Image mode. Blocks `18-keychain-areas` and `19-keychain-text` only in the sense that both must leave their features out of the smoothing pass.
