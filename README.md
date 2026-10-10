<div align="center">

# ▦ Gridfinity Baseplate Generator

**Dial in a baseplate. Watch it appear in 3D. Download an STL. Print.**

No server. No sign-up. No waiting in a queue. Just real CSG running in your browser.

[![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![three.js](https://img.shields.io/badge/three.js-preview-000?logo=threedotjs&logoColor=white)](https://threejs.org)
[![Manifold](https://img.shields.io/badge/manifold--3d-WASM-orange)](https://github.com/elalish/manifold)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## Why this exists

Gridfinity is brilliant, but every baseplate generator out there makes you trust somebody else's server, somebody else's defaults, and somebody else's idea of what a "42 mm cell" means. This one runs **entirely on your machine**: the geometry is built with a real solid-modeling kernel compiled to WebAssembly, so what you see is exactly what lands in the STL, with watertight meshes and no surprises in the slicer.

## What you get

- **Live 3D preview.** Change a number and the plate rebuilds in about 150 ms. Orbit it, zoom it, inspect the chamfers.
- **Any grid size.** Set units along X and Y, or switch to **custom size** and enter millimeters. Cells stay centered, and the plate grows to fit if you ask for more than the grid needs.
- **Magnet pockets and screw holes.** Flip a switch and the plate gets the extra floor it needs (4.65 mm → 8.65 mm) with 6.5 × 2.4 mm magnet seats and 3 mm screw holes in the right spots.
- **Printer bed overlay.** Show your build plate in the preview (256 × 256 by default) and see at a glance whether the thing fits.
- **Binary STL export.** One click, compact file, ready to slice.
- **Remembers you.** Parameters persist in `localStorage`, so you pick up where you left off.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints, tweak, export.

| Command         | What it does                                  |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Vite dev server with hot reload               |
| `npm run build` | Type check, then production build into `dist/` |
| `npm test`      | Geometry tests (vitest)                       |

## How it works

```
 params (React state)
        │
        ▼
 baseplate.ts ──► manifold-3d (WASM CSG) ──► Manifold
                                                │
                              ┌─────────────────┴───────────────┐
                              ▼                                 ▼
                       Viewport.tsx                          stl.ts
                    (three.js preview)                 (binary STL export)
```

- One cell pocket is built from hulls of rounded slabs following the Gridfinity profile (chamfers, 1.8 mm wall, 4 mm top radius, 0.25 mm clearance per side).
- A grid of those pockets, plus optional magnet and screw cylinders, is subtracted from a solid block.
- The same `Manifold` feeds both the viewer and the exporter, so the preview and the file can never disagree.

## Project layout

```
src/
├── App.tsx          # params, persistence, debounced rebuild
├── baseplate.ts     # all the CSG lives here
├── Viewport.tsx     # imperative three.js scene (Z-up, like your printer)
├── stl.ts           # Manifold → binary STL
└── baseplate.test.ts
```

## References

Standing on the shoulders of:

- [gridfinitygenerator.com](https://gridfinitygenerator.com): the three modes and the set of parameters
- [pandagao.github.io/gridfinity-studio](https://pandagao.github.io/gridfinity-studio): 3MF export and Bambu presets

## License

[MIT](LICENSE). Print it, remix it, ship it.
