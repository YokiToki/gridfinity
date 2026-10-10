# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc --noEmit` (type check) and then `vite build` into `dist/`
- `npm test` — `vitest run` (all tests)
- Single test: `npx vitest run src/baseplate.test.ts -t "<test name>"`

There is no linter configured.

## Workflow

Work is planned as numbered OpenSpec changes in `openspec/changes/NN-name/` (order and dependencies: `openspec/ROADMAP.md`). Take them strictly in numeric order, one change at a time.

1. **Pick the change.** The lowest-numbered active change (`openspec list`). Every change under its "Depends on" line must already be archived; otherwise stop.
2. **Apply.** `/opsx:apply NN-name`. Read proposal, specs, design and tasks before coding. Do the tasks in order, keep each one minimal and focused, and tick its checkbox (`- [x]`) right after it is truly done, with the behaviour from the spec fully implemented, not partly or deferred. If a task is unclear, needs extra scope or contradicts the design, stop and update the artifacts (`/opsx:update`) instead of guessing.
3. **UI tasks follow the design.** Each cites an artboard in `design/artboards/` (map in `design/README.md`). Build with the `ui/` components and Tailwind tokens from `theme.css`, no ad-hoc colours or sizes. Compare the result with the artboard in the browser, in both en and ru, and at 390 px if the layout changes. If no artboard exists, build from the component library and say so in the task.
4. **Rules for every task.**
   - All UI text goes through i18n: add keys to both `en.json` and `ru.json`.
   - Lengths are stored in mm; use `LengthField` for any length.
   - Geometry stays React-free in `geometry/`; add or update a vitest test with the task (geometry: validity and bounding box; UI: component test).
   - Verify what the task names (browser check, STL bbox/volume), not only that tests pass.
5. **Before closing a task section.** `npm test` and `npm run build` are green; the dev server starts and the console has no errors. Commit after each completed task section with a message that names the change, for example `04-fastener-placement: add FastenerSection`.
6. **Finish.** When all tasks are `[x]`, run `/opsx:archive NN-name` (sync specs, then archive) and commit. Archive in numeric order so the main specs stay consistent. Update the Architecture section below if the structure or conventions changed.

Changing the plan itself (new requirement, reorder, split a change) goes through `/opsx:update` or `/opsx:propose`, not by editing code first. Keep `openspec/ROADMAP.md` and the "Depends on" lines in sync when numbers change.

## Architecture

A client-only React 19 + TypeScript app (Tailwind CSS v4, Tabler Icons, react-router hash routes, i18next) that generates parametric Gridfinity parts, previews them in 3D and exports binary STL. There is no backend. Planned work lives in `openspec/changes/NN-*` (build order in `openspec/ROADMAP.md`); the visual design is in `design/` (artboard → task map in `design/README.md`).

Layout of `src/`:
- `app/` — entry (`main.tsx`, `App.tsx`), `routes.tsx` (hash router: `/` start page, `/box`, `/baseplate`, `/cutout`, unknown → start), `AppShell`, `Header` (mode switcher, mm/in, EN/RU), `StartPage`, `Workspace` (parameter panel + sticky footer + viewport; bottom drawer below 768 px), `usePersistedState`, `lastSession`, `theme.css` (Tailwind `@theme` tokens from the design).
- `ui/` — generic controls with no domain knowledge: `Section`, `Toggle`, `SegmentedControl`, `NumberField`, `LengthField`, `Banner`, `Button`, and units (`units.ts`, `UnitProvider`).
- `features/{baseplate,box,cutout,viewport}/` — a mode owns its panel, params and persistence key. Box and Cutout are `ComingSoon` placeholders until their changes land.
- `geometry/` — React-free CSG kernel, see "Geometry package" below.
- `i18n/` — `en.json`, `ru.json`, init with language detection.

Geometry package (`src/geometry/`, no React or three.js imports):
- `spec.ts` — Gridfinity constants (pitch 42, layer stacks `SOCKET_LAYERS`/`FOOT_LAYERS`, clearance, radii, fastener sizes). Pitch is a parameter everywhere, never read from a constant inside builders.
- `profiles.ts` — `layeredHull` is the one profile builder (low chamfer / wall / up chamfer); `socketPocket`, `binFoot`, `lipProfile(style)` are data-driven wrappers. Profile slabs overshoot the nominal top by `SLAB_T` (0.001 mm) on purpose, for clean cuts.
- `thickness.ts` — `Thickness` defaults and `validateThickness` (returns i18n keys `thickness.*`, never text). `sizing.ts` — `resolveAxis(size, pitch, align)` → cells, padding, offset, truncated.
- `footprint.ts` — `Footprint` (cells, size, offsets; origin = footprint centre), `footprintFromCells/Size`, `cellCenters`. `fasteners.ts` — `FastenerConfig` (per kind `{mode: none|corner|full|manual, manual: Point[]}` + sizes/presets/tolerance), `resolvePositions`, `switchMode` (Full→Manual keeps the points), `fastenerCuts(w, config, footprint, floor)` returning cuts and the same position list the 2D editor shows, `checkFasteners` (warning keys). Any mode that supports fasteners reuses these and `features/fasteners/FastenerSection`.
- `wasm.ts` — `getWasm(wasmUrl?)`, one WASM module per thread; the url is optional so tests run in Node. `model.ts` — `generate(mode, params)` dispatches by mode and returns `MeshData`; new modes are added to `ModeParams` there. `worker.ts` + `modelClient.ts` — the worker owns WASM; the client makes the latest request win and drops stale replies. UI side: `app/useModel(mode, params)` (debounce 150 ms, `busy` after 200 ms, `pending` while the mesh is stale, previous mesh kept on error).
- Tests: use `expectValidSolid` from `testing.ts` (status, non-empty, volume > 0, optional bbox). When refactoring geometry, add a volume + bbox regression case first and keep it green.

Conventions:
- **Geometry is built with `manifold-3d` (WASM), not three.js**, and runs in a Web Worker. The rest of the app only sees `MeshData` (typed arrays + bbox + volume), never `Manifold` objects. `Viewport` and `toBinaryStl` take `MeshData`. `Viewport.tsx` is imperative: the three.js scene is created once in a mount effect and driven through an `api` ref. Z is up. The camera is fitted only on the first model. In jsdom tests mock the Viewport (no WebGL).
- **Units:** everything is stored and computed in mm. Only `LengthField` converts to/from the display unit (`UnitProvider`, key `gridfinity.unit`); switching units never touches params. Use `LengthField` for any length, `NumberField` for unitless numbers.
- **i18n:** no hard-coded UI text; add keys to both `en.json` and `ru.json` (a test fails if they diverge). Language key `gridfinity.lang`; `<html lang>` follows the active language.
- **Persistence:** `usePersistedState(key, defaults, migrate?)` merges stored JSON over defaults and falls back to defaults on corrupt data; pass a `migrate` function when a stored shape changes (see `features/baseplate/migrate.ts`: old `magnets`/`screws` booleans → `fasteners`). One key per mode (`gridfinity.baseplate`).
- **Baseplate model:** `useModel('baseplate', params)` rebuilds on each param change. Magnets/screws add a `FLOOR` (4 mm) under the pockets (4.65 → 8.65 mm total). In custom-size mode the plate size is `max(custom, units × unit)` and cells stay centered.
- **Tests:** vitest; component tests start with `// @vitest-environment jsdom` (setup in `src/test-setup.ts`, RTL cleanup included).

UI strings are English/Russian; code comments are in Russian.
