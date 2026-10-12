# Proposal

## Why

A keychain almost always carries a name or a word. Today the only way to get lettering is to draw it in an image first. Text should be a first-class layer: typed in the panel, embossed or engraved, with a choice of font and size, placed visually.

## What Changes

- **Text layer** with content (several lines), font, size, weight/italic where the font has them, letter and line spacing, alignment and rotation.
- **Embossed or engraved:** embossed raises the letters by a height above the surface they sit on; engraved cuts them down by a depth, never below the minimum height or through the plate.
- **Fonts:** about two dozen of the most popular families from fontsource, all with Latin and Cyrillic, grouped as Sans, Serif, Display, Handwriting and Mono (for example Roboto, Open Sans, Montserrat, Inter, Oswald, Playfair Display, Lobster, Caveat, Roboto Mono); each is loaded only when chosen. Plus the generic families and an option to load your own TTF/OTF/WOFF file, kept in the browser. Fonts are files of the app itself, nothing is fetched from third-party servers.
- **Placement:** the placement editor gets a Text target: drag the text, type X/Y, rotate; the text is shown to scale over the silhouette.
- **Surface:** text may sit on the relief (inside the silhouette) or on the base plate outside it; the latter builds the plate in the heightfield (as for plate patterns).
- Works in both modes (Image and Shape) and with the two-halves mode (the text is on the front/top half only).

## Capabilities

### New Capabilities
- `keychain-text`: text layer, fonts, emboss/engrave, placement.

### Modified Capabilities

## Impact

- New `features/keychain/{TextSection,textRaster.ts,fonts.ts}`, text mask registered in the worker (like images), `geometry/keychain.ts` (`text` params, mask resampled to the grid, height rule), `PlacementEditor` text target, en/ru strings, tests.
- Out of scope: text on a curve, per-letter styling, outlined text tracing to vector contours, emoji and complex scripts shaping beyond what the browser canvas does, hosted fonts, kerning controls beyond letter spacing.
- Depends on: `11-keychain-relief`, `12-keychain-patterns`, `13-keychain-mounts`, `16-keychain-shape-mode`, `17-keychain-smoothing`.
