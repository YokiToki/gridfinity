# Tasks

## 1. Core bin

- [x] 1.1 Define `BoxParams` (size AxisSize ×2, height, thickness, lip, scoop, compartments, fasteners) with defaults; unit test defaults and persistence round trip.
- [x] 1.2 Foot instances + body + cavity for integer footprints; tests: 2×2×3 bbox 83.5×83.5×21, valid solid.
- [x] 1.3 Fractional footprint with padding floor; test 100 mm width gives 99.5 mm and two foot columns.
- [x] 1.4 Lip styles Default/Thin/None via lip profiles; test heights per style and foot-into-socket fit cross-section.

## 2. Features

- [x] 2.1 Wall/floor thickness with validation; tests for thicker walls and no-cavity error.
- [x] 2.2 Scoop per side with radius clamp; test cavity volume decreases and clamp notice.
- [x] 2.3 Compartments: equal grid, divider list model, merge; tests for divider count and merge.
- [x] 2.4 Fasteners at the bottom via `fastenerCuts`; test valid solid with magnets Full.

## 3. UI

- [x] 3.1 `BoxPanel` sections (Size, General, Lip with explanation tooltip, Walls, Scoop) with en/ru strings; render tests. Design: `design/artboards/Box.dc.html`.
- [x] 3.2 2D compartment editor (drag dividers, merge/split); component tests for merge and move.
- [x] 3.3 Verify in the browser: generate a 100×60 mm, 4-unit tall bin with 3×2 compartments and a front scoop, export STL, check bbox.
