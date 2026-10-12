# Design

## Context

The worker has no DOM, and fonts are a browser matter. The pipeline already supports registering raster data in the worker (`registerImage`) and resampling masks to the relief grid; plates in the grid are supported (`plateInGrid`).

## Decisions

- **Rendering text to a mask on the main thread.** `textRaster.ts` draws the text with Canvas 2D (`fillText`, `letterSpacing`, `fontKerning`) at 12 px/mm on an `OffscreenCanvas`/canvas sized to the text box, after `document.fonts.load(font)` resolves (so the real font is used, not a fallback). The result is a `Uint8Array` alpha mask plus its size and the mm-per-pixel; it is registered in the worker with a new message `{kind: 'text', textId, mask}`. Rasterising happens only when text, font, size, spacing or alignment change, not on moves (position and rotation are applied in the worker).
- **Params:** `TextParams = { enabled, content, font: {family, weight, italic, fileId?}, size (cap height mm), letterSpacing, lineSpacing, align, mode: 'emboss' | 'engrave', height, depth, x, y (fractions of the silhouette box, Y up), rotation }`, stored under `keychain.relief`; the font file bytes are stored in IndexedDB (same store module as images) under `fileId`.
- **Geometry:** in `buildGrid` the text mask is sampled at each node by inverse transform (position, rotation, scale to mm) with bilinear coverage ≥ 0.5; covered nodes get `top += height` (emboss) or `top = max(top − depth, floor)` (engrave), applied after detail lines and patterns so text stays crisp. Text over the plate (outside the silhouette) sets `plateInGrid` like plate patterns do; text beyond the plate is clipped.
- **Fonts:** the list is a data file (`features/keychain/fontList.ts`: id, label, group, fontsource package, weights) of about 24 families chosen for popularity and for having both the **latin and cyrillic** subsets: Sans (Roboto, Open Sans, Montserrat, Inter, Nunito, Raleway, Rubik, Fira Sans, PT Sans), Serif (Playfair Display, Merriweather, PT Serif), Display (Oswald, Russo One, Exo 2, Comfortaa, Press Start 2P), Handwriting (Pacifico, Lobster, Caveat, Marck Script), Mono (Roboto Mono, Source Code Pro, JetBrains Mono, Fira Code); the final list is confirmed against the fontsource metadata while implementing (a family without a Cyrillic subset is replaced). Variable `@fontsource-variable/*` packages are preferred (one file covers weights); only the latin and cyrillic subsets are imported, normal weight and bold.
- **Loading on demand:** each family is a dynamic `import('@fontsource-variable/<name>/…css')` run when the user picks it (and when a saved keychain needs it), so the initial bundle does not grow; Vite emits the woff2 files as assets of the same origin, which works offline after first use and on GitHub Pages. A bundle-size budget is checked in the verification task (initial JS unchanged, total asset growth reported).
- **Generic families and user fonts:** sans-serif, serif, monospace are always available; a user font is added with `FontFace` as described below. A user font is loaded with `new FontFace(name, bytes)`, added to `document.fonts` and stored; on reload it is restored before the first text raster. Unsupported or broken files give a localized error.
- **Resolution warning:** reuse `patternResolution` logic: if the stroke width (≈ size / 8) is under 4 grid cells, warn with the effective cell and offer to raise resolution.
- **Two halves:** the text only affects the top half's surface; the bottom half (mirrored) mirrors the geometry, so for text on the visible side only, the bottom half of the relief is built without text (a flag passed to the half builder). Documented in the UI hint.
- **Editor:** a `text` target in `PlacementEditor` draws the text box (rotated rectangle with the baseline) and drags it; the exact text shape is shown from the same mask thumbnail.

## Risks / Trade-offs

- Browser font rendering differs slightly between platforms; the exported geometry follows the rendered mask, so what the user sees is what prints on that machine.
- Very small text on a coarse grid is stair-stepped; mitigated by the warning and the raise-resolution action.
- Many font files add to the deployed size (each ≈ 30–90 KB per subset); mitigated by on-demand loading and a documented budget.
- Storing user fonts uses browser storage; fonts can be large, so only one user font per keychain is kept.
