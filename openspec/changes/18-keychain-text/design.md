# Design

## Context

The worker has no DOM, and fonts are a browser matter. The pipeline already supports registering raster data in the worker (`registerImage`) and resampling masks to the relief grid; plates in the grid are supported (`plateInGrid`).

## Decisions

- **Rendering text to a mask on the main thread.** `textRaster.ts` draws the text with Canvas 2D (`fillText`, `letterSpacing`, `fontKerning`) at 12 px/mm on an `OffscreenCanvas`/canvas sized to the text box, after `document.fonts.load(font)` resolves (so the real font is used, not a fallback). The result is a `Uint8Array` alpha mask plus its size and the mm-per-pixel; it is registered in the worker with a new message `{kind: 'text', textId, mask}`. Rasterising happens only when text, font, size, spacing or alignment change, not on moves (position and rotation are applied in the worker).
- **Params:** `TextParams = { enabled, content, font: {family, weight, italic, fileId?}, size (cap height mm), letterSpacing, lineSpacing, align, mode: 'emboss' | 'engrave', height, depth, x, y (fractions of the silhouette box, Y up), rotation }`, stored under `keychain.relief`; the font file bytes are stored in IndexedDB (same store module as images) under `fileId`.
- **Geometry:** in `buildGrid` the text mask is sampled at each node by inverse transform (position, rotation, scale to mm) with bilinear coverage ≥ 0.5; covered nodes get `top += height` (emboss) or `top = max(top − depth, floor)` (engrave), applied after detail lines and patterns so text stays crisp. Text over the plate (outside the silhouette) sets `plateInGrid` like plate patterns do; text beyond the plate is clipped.
- **Fonts:** list = bundled (Manrope, Unbounded, JetBrains Mono, loaded through the existing @fontsource CSS), generic families, and user fonts. A user font is loaded with `new FontFace(name, bytes)`, added to `document.fonts` and stored; on reload it is restored before the first text raster. Unsupported or broken files give a localized error.
- **Resolution warning:** reuse `patternResolution` logic: if the stroke width (≈ size / 8) is under 4 grid cells, warn with the effective cell and offer to raise resolution.
- **Two halves:** the text only affects the top half's surface; the bottom half (mirrored) mirrors the geometry, so for text on the visible side only, the bottom half of the relief is built without text (a flag passed to the half builder). Documented in the UI hint.
- **Editor:** a `text` target in `PlacementEditor` draws the text box (rotated rectangle with the baseline) and drags it; the exact text shape is shown from the same mask thumbnail.

## Risks / Trade-offs

- Browser font rendering differs slightly between platforms; the exported geometry follows the rendered mask, so what the user sees is what prints on that machine.
- Very small text on a coarse grid is stair-stepped; mitigated by the warning and the raise-resolution action.
- Storing user fonts uses browser storage; fonts can be large, so only one user font per keychain is kept.
