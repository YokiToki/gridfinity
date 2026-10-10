# Tasks

## 1. Split logic

- [ ] 1.1 Implement `autoCuts(cells, pitch, maxSize)`; table tests (fits, 294/256, single cell too big error).
- [ ] 1.2 Implement part descriptors (cell range, padding ownership, label); test assembled outline equals unsplit footprint.
- [ ] 1.3 Build each part from its range; test union of parts volume ≈ unsplit volume.

## 2. Connectors

- [ ] 2.1 Cut-face frame + end-face hole generator with count/inset/diameter; test hole alignment between neighbours.
- [ ] 2.2 Dovetail key/socket with clearance; test socket larger by clearance per side.
- [ ] 2.3 Collision avoidance with sockets and fastener holes; test shift and report cases.

## 3. UI

- [ ] 3.1 `SplitSection` (enable, source of build volume, margin, auto/manual cuts, connector settings) with en/ru strings.
- [ ] 3.2 Part list, labels, exploded preview toggle in the viewport; verify in the browser with a 300×200 mm plate.
- [ ] 3.3 Highlight oversize parts and warn; component test for the warning state.
