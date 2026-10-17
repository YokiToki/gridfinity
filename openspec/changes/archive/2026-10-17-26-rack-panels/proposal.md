# Proposal

## Why

3D printing for home racks is mostly 10-inch rack parts: blank and vented panels, filler plates, cable and accessory panels. The existing MakerWorld generators (a blank-panel generator with patterns, a mini-rack generator) run as OpenSCAD in the cloud with a long queue, no live preview and a fixed set of options. A client-side generator in this app gives instant preview, STL and 3MF export with the printer presets, and one place for rack parts next to the Gridfinity and Keychain tools.

## What Changes

- **New product section "Rack Master"** (route `/rack`, third card on the root start page, key 3), with a mode chooser like the other products. This change adds its first mode, **Panel**; enclosures and a Gridfinity tray follow in later changes.
- **Panel mode** generates a 10-inch rack panel of 1 to 10 U: 254 mm wide, height n × 44.45 mm (less an optional 0.45 mm height tolerance), a chosen thickness, rounded corners and the standard mounting holes in both ears: three per unit at 6.35, 22.225 and 38.1 mm from the unit's lower edge, 236.525 mm apart centre to centre. The hole shape (round or slot) and size are settings.
- **Through patterns** in the window between the ears (222.25 mm wide, inset by a margin): IKEA Skadis, hexagons, pills, lines, and a plain pass-through opening, each with its own settings and an optional 90° rotation. Asanoha and the Hicks hexagon follow in the next change.
- **Optional back wall** as a separate thin part behind the panel, so a multi-colour printer can show the pattern against another colour (separate objects in the 3MF).
- **Printability feedback:** strokes and walls below a minimum are flagged, and the part size is checked against the printer bed through the existing export panel.
- Start page art for the Rack card is a render of a default panel, produced by `npm run art` like the other cards.

## Capabilities

### New Capabilities
- `rack-panel`: the 10-inch rack panel generator.

### Modified Capabilities
- `app-shell`: the start page and the product sections include Rack Master.

## Impact

- New `geometry/rack/` (`spec.ts` constants, `panel.ts`, `patterns/*`), `geometry/model.ts` (a `rackPanel` mode), `features/rack/` (mode, panel sections), `app/products.ts`, `modes.tsx`, `routes.tsx`, `Header`, `StartPage` (three cards), `lastSession`, strings in en and ru, `scripts/render-art.ts` and `ModeArt`, tests.
- Reuses `LengthField`, `Section`, the export panel and printer presets, `usePersistedState`, the layered 2D tooling of `manifold-3d` (`CrossSection`).
- Out of scope: 19-inch racks, asanoha and Hicks patterns (next change), enclosures, trays, keystone jacks, fan and rack-ear styles other than the standard holes.
- Depends on: `10-product-sections`, `14-start-page-renders`, `09-export-3mf-bambu`.
