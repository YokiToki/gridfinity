# Tasks

## 1. Render pipeline

- [ ] 1.1 Spike and decide: z-buffer + tone tracing vs per-triangle polygons; record the choice and measured sizes for the three models in `design.md` (Decisions). Verification: sizes are below 60 KB each.
- [ ] 1.2 `src/geometry/art/projection.ts`: isometric projection and fit-to-viewBox. Tests: cube corners land at the expected symmetrical points; fit keeps the aspect ratio.
- [ ] 1.3 `src/geometry/art/shade.ts` + `raster.ts`: key-light shading with tone quantisation and a z-buffer tone image. Tests: cube shows three distinct tones for its visible faces; a plate with a hole shows the hole's inner wall and the floor behind it (no painter's artefacts).
- [ ] 1.4 `src/geometry/art/trace.ts`: marching squares + simplification to SVG path data with even-odd fill. Tests: a square and a ring trace to the expected number of subpaths; output rounded to 0.1 px and stable between runs.
- [ ] 1.5 `scripts/render-art.ts` and `npm run art`: build 2×2 baseplate, box and cutout models via `generate()` and write `src/app/art/{baseplate,box,cutout}.svg`. Verification: run it, commit the files, check each is ≤ 60 KB and opens in a browser.

## 2. Start page

- [ ] 2.1 Theme classes `.art-t0 … .art-t6`, `.art-edge` in `theme.css` from existing tokens, no new ad-hoc colours.
- [ ] 2.2 `ModeArt` shows the generated SVG (raw import, inline, `aria-hidden`), keeping the hover transition and card size; the hand-drawn SVGs are removed. Component test: each card renders an `svg` with the expected classes and no `fill` attributes; StartPage tests stay green. Design: `design/artboards/Main.dc.html` for card size and placement.
- [ ] 2.3 Test that every mode id has art, within the 60 KB budget, valid markup, and that the start page does not start a worker or mount a viewport.
- [ ] 2.4 Document `npm run art` (when to rerun) in the Architecture section of `CLAUDE.md`.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green; dev server console has no errors.
- [ ] 3.2 In the browser, en and ru, desktop, 390 px and a 2× zoom: compare with `design/artboards/Main.dc.html`; edges sharp, hover still animates, art matches the editor's default 2×2 parts, network tab shows no extra requests and no WASM/worker on the start page.
