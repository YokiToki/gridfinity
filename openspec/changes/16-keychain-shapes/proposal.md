# Proposal

## Why

Keychain Master starts only from an image. Many keychains need no picture: a plain round or rectangular tag with rounded corners and a raised rim, to which text (next change) and a ring mount are added. There should be two equal starting points: an image, or a ready-made shape.

## What Changes

- **Starting point:** the empty state and the top of the panel offer **Image** or **Shape**; switching keeps the other side's settings. Everything after the start (relief, plate, mounts, two halves, export) works the same for both; the rim is the one thing only shapes have.
- **Ready-made shapes:** Rectangle (with corner radius, down to a sharp corner), Circle, Ellipse, Capsule (stadium), and Polygon (3–12 sides, optional corner rounding, includes hexagon). Each has size in millimetres (width × height, diameter for the circle, side count for the polygon).
- **Rim ("бортик"):** a raised border along the edge of a ready-made shape with its own width and height. It exists only for shapes, not for image silhouettes. The inside of the rim is the normal relief level; the rim can be switched off.
- **Presets:** a few starting sizes (ID tag 54 × 30, round 40 mm, wide plate 70 × 25) that just fill the fields.
- **Mask and editor:** the shape produces the same silhouette mask, so the mask preview, placement editor, anchors, mounts, patterns and the two-halves mode work unchanged.

## Capabilities

### New Capabilities
- `keychain-shapes`: starting point, preset shapes, their size and corners, and the rim.

### Modified Capabilities

## Impact

- `geometry/keychain.ts` (`origin` param, shape rasteriser feeding the existing pipeline, rim in the heightfield, for shapes only), new `geometry/shapes.ts` (analytic inside tests and high-resolution mask), `features/keychain/{OriginSection,ShapeSection,KeychainMode}` (empty state with two cards), migrate, en/ru strings, tests.
- Out of scope: freehand or SVG-path editing, boolean combinations of shapes, text (separate change), shapes with holes (use the image path), rounded rim profiles (the rim is a flat-topped step with an optional bevel from the existing edge width).
- Depends on: `13-keychain-mounts` (archived), `15-keychain-ui-polish`. Blocks `19-keychain-text`.
