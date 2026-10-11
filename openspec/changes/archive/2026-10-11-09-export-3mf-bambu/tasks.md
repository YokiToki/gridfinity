# Tasks

## 1. Printer data

- [x] 1.1 Create `data/printers.ts` with presets, sources and en/ru names; validation test (unique ids, positive sizes, both languages).
- [x] 1.2 Printer selector + custom size + margin in the UI; wire to the preview build plate and split volume; test usable size 246 mm for 256/5. Design: `design/artboards/Export.dc.html`.

## 2. 3MF

- [x] 2.1 Implement `threemf.ts` writer (objects, build items, mm unit); round-trip test parses the zip and checks counts and unit.
- [x] 2.2 Implement shelf-packing arrangement incl. multi-plate; table tests for fit, overlap-free and overflow.
- [x] 2.3 Orientation rules and per-model override; test flipped export rests on the bed (min Z = 0).
- [x] 2.4 Inspect a project saved by the current Bambu Studio and implement `bambu.ts` metadata; open the exported file in Bambu Studio and confirm printer/process/filament are selected (user-assisted check).

## 3. Export block

- [x] 3.1 `ExportPanel`, the sticky block at the bottom of the parameter panel (not a modal) (format, per-part vs combined STL, Bambu options, orientation) with en/ru strings; component tests for option visibility by printer type. Design: `design/artboards/Export.dc.html`.
- [x] 3.2 Offline check: build + preview, disable network, export STL and 3MF succeed.
