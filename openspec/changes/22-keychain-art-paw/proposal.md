# Proposal

## Why

The Keychain card on the start page shows a plain disc with a star cut-out, and its outline and bevel are visibly stepped: the render comes from a 420 px bitmap sampled on a 0.25 mm grid, and the traced SVG outline keeps those stairs (runs of 0.3–0.7 viewBox units). Next to the smooth Gridfinity cards it looks unfinished, and a circle does not show what Keychain Master can do with a picture.

## What Changes

- **A more complex shape.** The Image-mode keychain art becomes a paw print (a palm pad with a notch plus four toes) with the ring eyelet above it, instead of the disc with a star. The shape is generated in code (no external image file), so `npm run art` keeps working from a clean checkout.
- **Smooth edges.** The outline of the art and the boundaries between tones stop showing pixel stairs. Both the source of the stairs (the bitmap and mesh resolution used for the render) and the SVG tracing (curve fitting of the traced loops) are addressed; the Gridfinity images stay byte-identical.
- `keychainImage.svg` is regenerated and committed; it stays within the 60 KB budget and the same visual height as the box art, so the cards on `/` remain level.
- The Keychain Shape card art is unchanged in content; it may be regenerated only if smoothing is applied to the whole Keychain group.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: the "Start page illustrations" requirement describes the Keychain Image card as a complex, smoothly outlined shape and adds a no-visible-stairs scenario.

## Impact

- `scripts/render-art.ts` (paw bitmap replaces `badgeBitmap`, finer grid for the keychain group), a new pure helper for the paw field with a unit test, an optional curve-smoothing step in `src/geometry/art/trace.ts` / `svg.ts` (opt-in so Gridfinity output does not change), regenerated `src/app/art/keychainImage.svg` (and possibly `keychainShape.svg`).
- No runtime change: the start page still shows static SVGs, no WebGL, worker or WASM.
- Out of scope: the Gridfinity images, the Keychain editor and its geometry pipeline (the smoothing is only for the art), light theme, a user-supplied image for the art, changing the card layout.
- Depends on: `11-keychain-relief`, `14-start-page-renders`, `21-collapsed-sections-previews`.
