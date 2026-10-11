# Design

## Context

`ModeArt.tsx` holds three hand-written isometric SVGs (stacked rounded rectangles). The start page must stay light: no viewport, no geometry (`app-shell` spec). Geometry is `manifold-3d` and `generate(mode, params)` already runs in Node (tests use it), so real meshes are available at build time. Box (`geometry/box.ts`) exists; Cutout arrives with `08`.

## Goals / Non-Goals

**Goals:** pictures that are the editor's own geometry, crisp, tiny, theme-aware, zero runtime cost.
**Non-Goals:** photoreal rendering, interactivity, Keychain card art.

## Options considered

1. **Raster screenshots (PNG/WebP).** Real three.js look, but 30–150 KB each at 2×, blurry beyond that, fixed colours; rejected by the requester.
2. **Live three.js on the start page.** Exact, but needs WebGL, WASM and the worker just for a card, three contexts at once, and breaks "no viewport on start". Rejected.
3. **Build-time vector render (chosen).** Real mesh → software isometric projection → flat shading → vector paths per tone. Small, sharp, themeable, deterministic enough to commit.

## Decisions

- **Script `scripts/render-art.ts`** (run with `tsx`, or via a vitest-free Node entry using the same `generate()`; the choice is settled by a 15-minute spike in task 1.1). For each mode: build `generate(mode, defaultsFor2x2)`, project, shade, trace, write `src/app/art/<mode>.svg`.
- **Models (confirmed):** "2×2" is the part size in Gridfinity units, one part per card. Baseplate 2×2 with default corner fasteners; Box 2×2×3 with **two dividers** (the interior reads as three compartments); Cutout 2×2×3 block with one pocket cut from the user's sample STL `plug.stl` (a butt-plug shaped part), imported with the app's own pipeline (parse, repair, orient, 3D mode, default clearance), so the card shows the real Cutout feature. Default thicknesses and lip.
- **Sample STL:** the source file is `tmp/plug.stl` (877 KB, git-ignored). The generated SVG is what ships, so the app never needs it; `npm run art` does. It is kept as `scripts/art/plug.stl` so the render can be reproduced from a clean checkout.
- **Projection:** true isometric (azimuth 45°, elevation 35.264°), orthographic, fitted to a fixed `viewBox` with the same card aspect as today (250×150/165), model centred, equal padding for the three modes so scale is consistent.
- **Visibility and shading without WebGL:** rasterise triangles into a small ID/depth buffer (z-buffer at ~3× target resolution) storing a per-pixel *tone index*; tone = quantised `max(0, n·L)` with a fixed key light plus ambient, 5–7 tones; plus a separate *edge* class where depth or normal changes sharply. This avoids painter's-algorithm artefacts on concave parts (bin interior, pockets).
- **Vectorisation:** trace each tone's region to polygons (marching squares on the tone buffer, then Douglas–Peucker simplification at ~0.3 px), emit one `<path class="t3">` per tone with even-odd fill, ordered dark→light; edges as one thin stroke path. A traced result avoids thousands of per-triangle polygons and keeps files well under the 60 KB budget; the tolerance is the single knob. Fallback if tracing is not worth the complexity: per-triangle polygons grouped by tone after depth sort, accepted only if the budget holds for all three models (decided in the spike).
- **Theming:** tones are classes (`.art-t0 … .art-t6`, `.art-edge`) defined once in `theme.css` from existing tokens (the blue-grey ramp already used by the schematic art plus the accent for fastener holes/pocket rim), not baked colours. The SVGs carry no `fill` values.
- **Delivery:** import the SVG files as raw strings (`?raw`) and inline them, so CSS classes apply and hover transform keeps working; `aria-hidden`. Vite already handles `?raw`; no new dependency except a dev-time `tsx` (or none if the entry is a vitest-run script).
- **Determinism and freshness:** output is rounded to 0.1 px with stable ordering so regeneration only changes files when geometry changes. A test checks existence, size budget and basic SVG validity; it intentionally does **not** diff against fresh generation (WASM float differences across platforms would cause flakiness). The ROADMAP/CLAUDE convention: rerun `npm run art` when default geometry changes.
- **Pure helpers** (`projection`, `shade`, `raster`, `trace`) live under `src/geometry/art/` with no DOM/React so they can be unit-tested on tiny meshes (a cube, a plate with a hole).

## Risks / Trade-offs

- Traced shapes can look polygonal at 2× zoom → tolerance and resolution tuned against the current card size, checked on a 2× display in the browser task.
- Art can drift from the editor after geometry changes → manual regen step documented in CLAUDE.md; acceptable for three images.
- Cutout art depends on `08` defaults; if 08 changes its default pocket, regenerate.
