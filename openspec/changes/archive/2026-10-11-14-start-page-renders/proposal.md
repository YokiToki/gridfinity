# Proposal

## Why

The mode cards on the start page show hand-drawn schematic SVGs (`src/app/ModeArt.tsx`: stacked rectangles faking an isometric slab). They no longer look like what the editor produces: real feet, lips, compartments, fastener ears and pockets are missing. The cards should show renders of the actual 2×2 parts from the editor.

Two obvious ways are poor: shipping raster screenshots (heavy, blurry on hi-dpi, cannot follow the theme or language-independent) and rendering the real three.js scene on the start page (WebGL context, WASM geometry and a worker just to show a card; the start page deliberately renders no viewport and computes no geometry).

## What Changes

- **Pre-rendered vector art.** A build-time script generates each mode's model with the real `generate()` (2×2 units, default settings), projects it isometrically, shades it flat with a fixed light and quantises the shades into a handful of tones, and writes a compact SVG per mode. The SVGs are committed; the app only displays them.
- Tones are CSS classes mapped to theme tokens, so the art follows `theme.css` (and any future theme) with no recolouring in the SVG files.
- Cards for Box (2×2 bin with a compartment divider), Baseplate (2×2 plate with corner fasteners) and Cutout (2×2 block with a pocket) use the new art in place of `ModeArt`'s hand-drawn SVGs; hover motion and layout stay.
- `npm run art` regenerates the files; a test checks that every mode has art within a size budget and valid markup. Art is regenerated and committed manually when the geometry or default settings change.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: start page mode cards show renders of the actual parts.

## Impact

- New `scripts/render-art.ts` (+ small `geometry`-side projection/shading helpers that stay React-free and are unit-tested), `src/app/art/*.svg`, updated `ModeArt.tsx`, `package.json` script, tests.
- No runtime geometry, WASM, WebGL or image decoding on the start page; bundle grows by the SVG size only.
- Out of scope: the Keychain Master card (art can be added later from the sample emblem once `11-keychain-relief` exists), animated or interactive previews, light theme, automatic regeneration in CI, raster fallbacks.
- Depends on: `07-box-mode`, `08-cutout-mode`, `10-product-sections`.
