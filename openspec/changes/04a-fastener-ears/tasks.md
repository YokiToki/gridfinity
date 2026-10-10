# Tasks

## 1. Geometry

- [ ] 1.1 Add `socketWindow` to `geometry/profiles.ts` (rounded outline equal to the lowest pocket layer); test: widths match the pocket bottom and it is a valid solid.
- [ ] 1.2 Add `earWall` to `FastenerConfig` (default 1.2) and an ear builder (hull of hole disc and window corner); tests: ear covers the hole with the wall margin, reaches the window corner, valid solid.
- [ ] 1.3 Rework `buildBaseplate` to cut per-cell windows minus ears when holes exist; tests: Full 2×2 has no continuous floor (volume far below the old floor volume, height 8.65), Corner leaves empty cells open, no fasteners is unchanged (regression volumes still match).
- [ ] 1.4 Extend `checkFasteners` with an "ear does not fit" warning key; test it for a large magnet and a large ear wall.

## 2. Manual placement as a selection

- [ ] 2.1 Replace `manual` points with `slots` (cell index + corner) in `geometry/fasteners.ts`: `resolvePositions`, `switchMode` (switching to Manual from any mode starts with no slots; leaving Manual keeps them), pruning of slots outside the grid; tests for a 2×2 and a 3×2 grid, shrinking the grid and a plate with no selected slot (no ears, height 4.65).
- [ ] 2.2 Simplify `PlacementEditor` to toggle buttons at standard positions (`role="switch"`, keyboard operable, per-position labels); remove drag, free add, the coordinate list, the "Add hole" button and the unused helpers in `placement.ts`; update i18n keys in `en.json` and `ru.json`; component tests for toggle on, toggle off, keyboard, an empty start when switching to Manual from Full and the magnet/screw switcher. Design: `design/artboards/Baseplate.dc.html`.
- [ ] 2.3 Migration: stored coordinate points snap to the nearest standard position within 3 mm and the rest are dropped; boolean flags still load as Full; tests for exact, near, far and duplicate points, and for old and new JSON.

## 3. UI

- [ ] 3.1 Add the ear wall field to `FastenerSection` and update the floor note to describe ears (en/ru); render test. Design: `design/artboards/Baseplate.dc.html`.
- [ ] 3.2 Fix clipped segmented labels: shorter placement labels and wrapping-safe segments in `ui/SegmentedControl.tsx`; component test with the Russian labels; compare in the browser at 380 px in en and ru. Design: `design/artboards/Components.dc.html`.

## 4. Reconcile planning artifacts

- [ ] 4.1 Update `05-baseplate-model` (proposal, design, spec, tasks): fasteners add ears rather than raising a floor; the "floor raised with notice" requirement and task 1.4 change accordingly; keep floor style as the explicit open frame / solid floor choice. Run `openspec validate 05-baseplate-model`.
- [ ] 4.2 Update `CLAUDE.md` (fasteners section: ears, Manual as a slot selection, migration).

## 5. Verification

- [ ] 5.1 `npm test` and `npm run build` pass; in the browser: Full and Corner show ears around holes and open cells elsewhere, the STL has the expected height (8.65 mm) and fewer triangles/volume than the old floor, toggling positions in Manual mode changes the preview and the STL, the placement control labels fit in en and ru, and old stored state (including coordinate-based manual holes) loads.
