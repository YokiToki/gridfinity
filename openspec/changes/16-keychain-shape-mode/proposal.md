# Proposal

## Why

Keychain Master is a single mode that starts from an image. Many keychains need no picture: a plain round or rectangular tag with rounded corners and a raised rim, to which text and a ring mount are added. The two starts are different enough (a silhouette mask with threshold, holes and a preview for images; none of that for a drawn shape) that they should be two separate modes, the way Gridfinity Master has Box, Baseplate and Cutout, each with its own page, panel and saved settings, over shared geometry.

## What Changes

- **Two modes in Keychain Master:** **1 Image** (what exists now) and **2 Shape** (new). The product gets a mode chooser page at `/keychain` (two cards, keys 1/2, like `/gridfinity`), routes `/keychain/image` and `/keychain/shape`, and the mode switcher in the header (as in Gridfinity). Each mode has its own saved settings: Image keeps `keychain.relief`, Shape uses `keychain.shape`. "Continue" on the start page remembers the mode.
- **Shape mode** has no image and no mask: no Image section, no threshold/invert/close/specks/grow, no areas, no mask preview or enlarge button, no brightness height source. Its panel is: **Shape** (with Size), Rim, Smoothing (surface only), Pattern, Base plate, Mount, Split, Resolution, Export options. The Relief profile and Detail lines sections belong to the Image mode only: a shape is a flat plate (plate thickness plus a 1 mm flat plateau) whose height comes from the Base plate and the Rim.
- **Ready-made shapes:** Rectangle (corner radius from sharp to fully round), Circle, Ellipse, Capsule (stadium), Polygon (3–12 sides, corner rounding, includes hexagon); size in millimetres (width × height, diameter for the circle), rotation for the polygon, and a few size presets (ID tag 54 × 30, round 40 mm, wide plate 70 × 25).
- **Rim ("бортик"):** a raised border along the edge of the shape with its own width and height; shapes only.
- **What both modes share:** relief profiles, detail lines, surface patterns, base plate, ring mount and placement editor, two halves with pins, assembled view (later change), export. The shared sections are one set of components used by two panels.
- The placement editor draws the shape's outline analytically (shape mode has no mask).

## Capabilities

### New Capabilities
- `keychain-shape-mode`: the Shape mode, its shapes and rim, and the two-mode structure of Keychain Master.

### Modified Capabilities
- `app-shell`: Keychain Master gets modes, a mode chooser and routes.

## Impact

- `app/products.ts` (keychain with modes), `routes.tsx`, `Header`, `StartPage`/`ModeChooser` (generalised by product), `lastSession`, `features/keychain/KeychainMode.tsx` split into a shared `KeychainWorkspace` plus `ImageMode` and `ShapeMode`, new `ShapeSection`/`RimSection`, `geometry/shapes.ts`, `geometry/keychain.ts` (`origin`: shape params feed the existing pipeline), `PlacementEditor` outline from shape, migrate, en/ru strings, tests.
- Out of scope: freehand or SVG-path editing, boolean combinations of shapes, shapes with holes (use the image mode), rounded rim profiles (the rim is a flat-topped step), changing how the Image mode works.
- Depends on: `13-keychain-mounts` (archived), `15-keychain-ui-polish`. Blocks `19-keychain-text`, and tells `17`/`18` which settings are image-mode only.
