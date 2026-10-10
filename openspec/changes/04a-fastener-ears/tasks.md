# Tasks

## 1. Geometry

- [ ] 1.1 Add `socketWindow` to `geometry/profiles.ts` (rounded outline equal to the lowest pocket layer); test: widths match the pocket bottom and it is a valid solid.
- [ ] 1.2 Add `earWall` to `FastenerConfig` (default 1.2) and an ear builder (hull of hole disc and window corner); tests: ear covers the hole with the wall margin, reaches the window corner, valid solid.
- [ ] 1.3 Rework `buildBaseplate` to cut per-cell windows minus ears when holes exist; tests: Full 2×2 has no continuous floor (volume far below the old floor volume, height 8.65), Corner leaves empty cells open, no fasteners is unchanged (regression volumes still match).
- [ ] 1.4 Extend `checkFasteners` with an "ear does not fit" warning key; test it for a large magnet and a large ear wall.

## 2. Remove manual placement

- [ ] 2.1 Remove the `manual` mode, `manual` arrays and `switchMode` from `geometry/fasteners.ts`; update tests.
- [ ] 2.2 Delete `PlacementEditor`, `placement.ts` and their tests; remove the unused i18n keys in `en.json` and `ru.json`; `FastenerSection` drops the editor.
- [ ] 2.3 Migration: stored `manual` kinds load as `full`; tests for old boolean JSON, manual JSON and new JSON.

## 3. UI

- [ ] 3.1 Add the ear wall field to `FastenerSection` and update the floor note to describe ears (en/ru); render test. Design: `design/artboards/Baseplate.dc.html`.
- [ ] 3.2 Fix clipped segmented labels: shorter placement labels and wrapping-safe segments in `ui/SegmentedControl.tsx`; component test with the Russian labels; compare in the browser at 380 px in en and ru. Design: `design/artboards/Components.dc.html`.

## 4. Reconcile planning artifacts

- [ ] 4.1 Update `05-baseplate-model` (proposal, design, spec, tasks): fasteners add ears rather than raising a floor; the "floor raised with notice" requirement and task 1.4 change accordingly; keep floor style as the explicit open frame / solid floor choice. Run `openspec validate 05-baseplate-model`.
- [ ] 4.2 Update `CLAUDE.md` (fasteners section, no manual mode, ears).

## 5. Verification

- [ ] 5.1 `npm test` and `npm run build` pass; in the browser: Full and Corner show ears around holes and open cells elsewhere, the STL has the expected height (8.65 mm) and fewer triangles/volume than the old floor, the placement control labels fit in en and ru, and old stored state loads.
