# Tasks

## 1. Geometry

- [ ] 1.1 Define new `BaseplateParams` (AxisSize, thickness, floor) and migrate persisted prototype state; test old JSON loads.
- [ ] 1.2 Build outer block with cells + padding + alignment; tests: 84×84, 300×200 give exact bbox and correct cell count.
- [ ] 1.3 Implement floor styles and thickness settings; tests: open frame height 4.65, floor 1.2 adds 1.2.
- [ ] 1.4 Integrate `fastenerCuts`; auto-raise floor with a message key; test notice is returned.

## 2. UI

- [ ] 2.1 `SizeSection` with units/mm toggle and alignment per axis; component test for 300 mm → 7.14 units.
- [ ] 2.2 `ThicknessSection` with reset and validation messages (en/ru).
- [ ] 2.3 Build plate toggle, size presets, oversize warning; verify in browser with a 300 mm plate.
- [ ] 2.4 Measurements readout in mm/inch; test 84 mm → 3.307 in.
- [ ] 2.5 Visual parity pass against gridfinitygenerator.com (outer wall, corner radius) with side-by-side screenshots.
