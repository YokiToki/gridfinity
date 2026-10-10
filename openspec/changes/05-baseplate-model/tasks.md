# Tasks

## 1. Geometry

- [x] 1.1 Define new `BaseplateParams` (AxisSize, thickness, floor) and migrate persisted prototype state; test old JSON loads.
- [x] 1.2 Build outer block with cells + padding + alignment; tests: 84×84, 300×200 give exact bbox and correct cell count.
- [x] 1.3 Implement floor styles and thickness settings; tests: open frame height 4.65, floor 1.2 adds 1.2.
- [x] 1.4 Integrate `fastenerCuts` and `cellWindows` (ears from `04a-fastener-ears`); pocket bottom at `max(floor, 4 mm)` with holes, windows from the floor thickness up; tests: open frame + magnets keeps floor 0 and height 8.65, solid floor 1.2 + magnets keeps a 1.2 mm floor under the windows, floor ≥ 4 mm absorbs the ears.

## 2. UI

- [x] 2.1 `SizeSection` with units/mm toggle and alignment per axis; component test for 300 mm → 7.14 units. Design: `design/artboards/Baseplate.dc.html`. Include the remainder-alignment control (Left/Centered/Right) and the padding info banner.
- [x] 2.2 `ThicknessSection` with reset and validation messages (en/ru). Design: `design/artboards/Baseplate.dc.html`.
- [x] 2.3 Build plate toggle, size presets, oversize warning; verify in browser with a 300 mm plate.
- [x] 2.4 Measurements readout in mm/inch; test 84 mm → 3.307 in.
- [x] 2.5 Visual parity pass against gridfinitygenerator.com (outer wall, corner radius) with side-by-side screenshots.
