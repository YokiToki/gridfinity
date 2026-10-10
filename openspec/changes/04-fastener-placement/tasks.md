# Tasks

## 1. Model and geometry

- [ ] 1.1 Define `FastenerConfig` and defaults/presets; unit tests for preset values and tolerance.
- [ ] 1.2 Implement position resolution for none/corner/full on resolved cells; table tests for 1×1, 2×2, 3×2 and fractional footprints.
- [ ] 1.3 Implement `fastenerCuts` returning cuts + positions; geometry test: hole count and valid solid for each mode.
- [ ] 1.4 Add persisted-state migration from the old booleans; test old stored JSON loads as `full`.

## 2. UI

- [ ] 2.1 Build `FastenerSection` (mode segmented control, dimensions, presets) with en/ru strings; render test per mode. Design: `design/artboards/Baseplate.dc.html`, `design/artboards/Box.dc.html`.
- [ ] 2.2 Build the 2D `PlacementEditor` (SVG: toggle snap points, drag, coordinate list, delete); component tests for add, move, delete and Full→Manual materialization. Design: `design/artboards/Baseplate.dc.html`. (placement editor, point list, mm readout).
- [ ] 2.3 Wire into the Baseplate panel and verify in the browser that holes appear in the preview and in an exported STL (bbox/volume check).
