# Tasks

## 1. Split logic

- [x] 1.1 Implement `autoCuts(cells, pitch, maxSize)`; table tests (fits, 294/256, single cell too big error).
- [x] 1.2 Implement part descriptors (cell range, padding ownership, label); test assembled outline equals unsplit footprint.
- [x] 1.3 Build each part from its range; test union of parts volume ≈ unsplit volume.

## 2. Connectors

- [x] 2.1 Cut-face frame + end-face hole generator with count/inset/diameter; test hole alignment between neighbours.
- [x] 2.2 Dovetail key/socket with clearance; test socket larger by clearance per side.
- [x] 2.3 Collision avoidance with sockets and fastener holes; test shift and report cases.

## 3. UI

- [x] 3.1 `SplitSection` (enable, source of build volume, margin, auto/manual cuts, connector settings) with en/ru strings. Design: `design/artboards/BaseplateSplit.dc.html`.
- [x] 3.2 Part list, labels, exploded preview toggle in the viewport; verify in the browser with a 300×200 mm plate. Design: `design/artboards/BaseplateSplit.dc.html`.
- [x] 3.3 Highlight oversize parts and warn; component test for the warning state.
