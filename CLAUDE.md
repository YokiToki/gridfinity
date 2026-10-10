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
- `geometry/` — React-free CSG (`baseplate.ts`, `stl.ts`).
- `i18n/` — `en.json`, `ru.json`, init with language detection.

Conventions:
- **Geometry is built with `manifold-3d` (WASM), not three.js.** `geometry/baseplate.ts` is the only place that does CSG; spec dimensions (`H`, `CHAMFER_*`, `WALL`, `CLEARANCE`, …) are module constants at the top. `getWasm()` caches one module promise; the app passes the `?url`-imported `manifold.wasm`, tests call `buildBaseplate(params)` without a URL (keep `wasmUrl` optional).
- **The `Manifold` object is the model.** `Viewport` and `toBinaryStl` read it through `getMesh()`. `Viewport.tsx` is imperative: the three.js scene is created once in a mount effect and driven through an `api` ref. Z is up. The camera is fitted only on the first model. In jsdom tests mock the Viewport (no WebGL).
- **Units:** everything is stored and computed in mm. Only `LengthField` converts to/from the display unit (`UnitProvider`, key `gridfinity.unit`); switching units never touches params. Use `LengthField` for any length, `NumberField` for unitless numbers.
- **i18n:** no hard-coded UI text; add keys to both `en.json` and `ru.json` (a test fails if they diverge). Language key `gridfinity.lang`; `<html lang>` follows the active language.
- **Persistence:** `usePersistedState(key, defaults)` merges stored JSON over defaults and falls back to defaults on corrupt data. One key per mode (`gridfinity.baseplate`).
- **Baseplate model:** a 150 ms debounced effect rebuilds on each param change with a `cancelled` flag for stale results. Magnets/screws add a `FLOOR` (4 mm) under the pockets (4.65 → 8.65 mm total). In custom-size mode the plate size is `max(custom, units × unit)` and cells stay centered.
- **Tests:** vitest; component tests start with `// @vitest-environment jsdom` (setup in `src/test-setup.ts`, RTL cleanup included).

UI strings are English/Russian; code comments are in Russian.
