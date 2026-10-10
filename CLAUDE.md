# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc --noEmit` (type check) and then `vite build` into `dist/`
- `npm test` — `vitest run` (all tests)
- Single test: `npx vitest run src/baseplate.test.ts -t "<test name>"`

There is no linter configured.

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
