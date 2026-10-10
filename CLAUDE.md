# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — `tsc --noEmit` (type check) and then `vite build` into `dist/`
- `npm test` — `vitest run` (all tests)
- Single test: `npx vitest run src/baseplate.test.ts -t "<test name>"`

There is no linter configured.

## Architecture

A client-only React 19 + TypeScript app that generates a parametric Gridfinity baseplate, previews it in 3D, and exports it as a binary STL. There is no backend.

Data flow: `App.tsx` (params state) → `baseplate.ts` (`buildBaseplate`, which returns a `Manifold`) → `Viewport.tsx` (three.js preview) and `stl.ts` (`toBinaryStl` export).

- **Geometry is built with `manifold-3d` (WASM), not three.js.** `baseplate.ts` is the only place that does CSG. It builds one cell pocket from hulls of rounded slabs and then subtracts a grid of pockets, with optional magnet and screw cylinders, from a cube. Spec dimensions (`H`, `CHAMFER_*`, `WALL`, `CLEARANCE`, and so on) are module constants at the top of the file.
- **WASM loading:** `getWasm()` caches a single module promise. The app passes the `?url`-imported `manifold.wasm` (`wasmUrl`) so Vite can serve it. Tests call `buildBaseplate(params)` without a URL, so Node resolves the WASM itself. Keep the `wasmUrl` parameter optional.
- **The `Manifold` object is the model.** `Viewport` and `toBinaryStl` both read it through `getMesh()` (`vertProperties` with a `numProp` stride, plus `triVerts`). `Viewport` copies the first three properties of each vertex into a three.js `BufferGeometry` itself.
- **`Viewport.tsx` is imperative.** The three.js scene is created once in a mount effect and exposed through an `api` ref (`setModel`). A separate effect pushes model changes to it. The Z axis is up (`camera.up = (0,0,1)`), which matches the Gridfinity/STL coordinate system. The camera is fitted only on the first model.
- **`App.tsx`:** params are persisted in `localStorage` (key `gridfinity.baseplate`) and merged over `defaultParams` on load. A 150 ms debounced effect rebuilds the model on each param change, and a `cancelled` flag drops stale results.
- When magnets or screws are enabled, the plate gets an extra `FLOOR` (4 mm) of thickness under the pockets, so the total height goes from 4.65 to 8.65 mm. The tests assert this.
- In custom-size mode, the plate size is `max(custom, units × unit)` and the cells stay centered.

UI strings are English, although `index.html` has `lang="ru"` and code comments are in Russian.
