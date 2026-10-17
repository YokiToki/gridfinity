# Tasks

## 1. Model and palette

- [x] 1.1 `Cutout.color` and the assignment rule in `addCutout` and `duplicateCutout` (`geometry/cutout.ts`), `circleCutout`/`rectCutout` stay colour-free (the list assigns); `color` copied into `ToolMesh` by `buildCutoutTools`. Tests in `cutout.test.ts`: three adds give three distinct colours, reorder and delete keep the others, a deleted colour is reused first, a duplicate differs from its original, more than 7 cutouts repeat in order, tools carry the cutout colour.
- [x] 1.2 Palette tokens `--color-cutout-0…6` in `app/theme.css` and `cutoutColorVar(i)` in `features/cutout/palette.ts`. Test: seven tokens exist in `theme.css`, each at least 3:1 against `--color-surface-1` (computed in the test from the hex values), the helper wraps modulo 7.
- [x] 1.3 `migrateCutout` fills missing or invalid colours by list order; stored sessions with colours are untouched. Test in `features/cutout`.

## 2. Views

- [x] 2.1 List swatch in `CutoutPanel` rows (decorative, name stays the accessible label). Component test: every row has a swatch whose colour variable matches its cutout; no new unlabelled interactive element. UI task without an artboard: build from existing components and tokens and say so in the commit.
- [x] 2.2 `TopView` fills and strokes shapes in their colours; selected shape stronger. Component test: shapes carry the colour variable, the selected shape has the stronger fill and the dashed box. Verify in the browser in en and ru at 390 px with four cutouts (rect, circle, rect, STL part).
- [x] 2.3 `Viewport` paints each tool with its token colour (read once per build with `getComputedStyle`, fallback to the old cyan when empty). Unit test for the resolve helper with a stub style; verify in the browser that tools match the list swatches and the top view, the overlay toggle still works, and the exported STL is unchanged.

## 3. Verification

- [x] 3.1 `npm test` and `npm run build` are green, no console errors; in the browser with four cutouts the three views agree on colours, reordering does not recolour, and hiding a cutout removes its tool.
