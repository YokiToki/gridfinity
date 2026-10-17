# Design

## Context

Products are registered in `app/products.ts` (id, path, icon, modes, `artId`) with modes in `app/modes.tsx` and routes in `routes.tsx`; the root `StartPage` and `ModeChooser` list them, `Header` switches products and modes, and `lastSession` remembers the last product and mode. Geometry modes are keys of `ModeParams` in `geometry/model.ts`, built in the worker with `manifold-3d`; a mode returns `parts: PartMesh[]` (labels), exported by the shared export panel (STL, or 3MF with separate objects). 2D shapes are `CrossSection`s extruded with `Manifold.extrude`, as in the cutout and keychain code. The start page art is pre-rendered by `scripts/render-art.ts` from `generate()`.

## Goals / Non-Goals

**Goals:**
- A product section that later modes (enclosure, tray) plug into without new plumbing.
- Exact standard 10-inch rack dimensions in one constants module, covered by tests.
- Patterns as small pure functions from a region and settings to a 2D cut, so adding asanoha and Hicks later is one file each.

**Non-Goals:**
- 19-inch racks, other ear styles, enclosures, trays, engraved patterns.

## Decisions

- **Constants** (`geometry/rack/spec.ts`): `U = 44.45`, panel width 254, ear-hole spacing 236.525, window 222.25, hole offsets `[6.35, 22.225, 38.1]` within each U, height tolerance 0.45. They come from the rack standard drawing the project owner supplied (the 10-inch half of the 19-inch comparison drawing); a test pins every number. Pitch-like values are parameters of the builders, not read from the constants inside them, in line with the rest of the geometry.
- **Panel body:** a rounded rectangle `CrossSection` (corner radius default 3 mm, 0 allowed) minus ear holes minus the pattern cut, extruded by the thickness (default 3 mm, range 1.5–8). Coordinates: x centred on the panel, y from the panel's lower edge, z from 0 (back) to the thickness (front). The tolerance shortens the height and keeps hole positions measured from the lower edge of each unit, with the lowest unit's offset moved up by half the tolerance so the holes stay centred in the lost sliver. Alternative: shrink symmetrically. Rejected: mounting holes must stay on the standard grid.
- **Ear holes:** round (diameter default 6.5 mm) or slot (width 6.5, length 10 mm, long axis horizontal), positions `all | outer | edges` (edges = only the lowest and the highest hole of each ear, four per panel), as `CrossSection` circles and rounded rectangles. The slot is the style in the reference renders; round is the common one. Both are data in one function.
- **Pattern region:** x ∈ ± (window / 2 − margin), y ∈ [margin, height − margin], margin default 3 mm (user setting). A pattern is `(region, settings, rotate) → CrossSection` (union of cut shapes, already clipped to complete elements inside the region). Rotation by 90° swaps the roles of x and y inside the region, so the same code serves both. Patterns in this change: `skadis` (slot 5 × 15, row pitch 40, row step 20, alternate rows shifted by 20, all configurable, defaults from the IKEA board drawing), `hex` (flat-to-flat width default 8, wall 1.6, honeycomb), `pills` (horizontal, brick-like: width 6, length 20, wall 2, every second row shifted by half a pitch, optional shortened pills filling the leftover row ends), `lines` (height 3, wall 2, full region width), `passthrough` (one rounded opening, extra vertical and horizontal border).
- **One piece:** after cutting, a check decomposes the solid and requires one component; where a setting makes elements touch the frame in a way that isolates a piece (for example lines with a zero margin), `validateRackPanel` reports `rack.error.disconnected` and generation is skipped for that state, like other modes' validation. Minimum feature width 0.8 mm (two perimeters at a 0.4 mm nozzle) produces `rack.warning.thin` with the offending setting.
- **Back wall:** a second part `back`, same outline and ear holes, thickness default 0.6 mm (0.2–2), placed behind the panel (z from −t to 0). Alternative: one body with a closed back. Rejected: the colour change needs separate objects, and the export panel already supports separate parts.
- **Model plumbing:** `ModeParams.rackPanel`, `generate('rackPanel', params)` returns `parts` labelled `panel` and (optionally) `back`, `sheetLayout` is not used (the export arranges parts normally, panel flat with its front face up, the back wall beside it).
- **Product and routes:** `ProductId` gains `'rack'`, path `/rack`, `IconServer` (Tabler) as icon, modes `[panel]` with path `/rack/panel`, the chooser shows one card until later changes add modes; legacy redirects are not needed. `lastSession` already stores the product as a string, so it needs only to accept `'rack'`. Persisted state key `rack.panel`, migrated with a `migrateRackPanel` that normalises every nested object.
- **UI:** `RackPanelMode` uses `Workspace` with sections Size (U, thickness, corner radius, tolerance), Ears (positions, shape, size), Pattern (kind, region margin, rotation, then the settings of the chosen kind), Back wall; every length through `LengthField`; section summaries and "changed" highlights through `isChanged`; Start over through `Workspace` as in the other modes. No artboard exists for the Rack product: build from `ui/` components and `theme.css` tokens and say so in the tasks.
- **Start page:** with three products the cards sit in a three-column row from `md` up and stack below; hotkeys 1–3. The Rack card art is `rackPanel.svg`, a render of a 2 U Skadis panel (angled so ears and pattern read), produced by `npm run art` in its own group so the other pictures stay byte-identical; its height is matched to the box art like the keychain card (`BOX_ART_HEIGHT`), so three cards stay level.

## Risks / Trade-offs

- [Complete-element-only patterns leave uneven borders] → the margin and a "centre the pattern" rule (the pattern grid is centred on the region) keep borders symmetric; documented in the pattern help.
- [Slots disconnecting the panel at the edges] → the one-piece check and the margin default 3 mm.
- [A 10 U panel is far bigger than most beds] → the export panel already says it does not fit; no splitting in this change.
- [Three cards on the start page change the layout of a shipped page] → part of the UI task, verified in en and ru at 390 px.

## Open Questions

- Default pattern sizes other than Skadis (hex width, pills and lines sizes) are taken from the reference generator's defaults and tuned by eye in the browser; the specs name no numbers for them.
