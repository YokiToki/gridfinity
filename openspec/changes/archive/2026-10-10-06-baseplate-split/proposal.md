# Proposal

## Why

Printer beds are limited (e.g. 256 mm), but drawers are not. A large baseplate must be divided into printable parts that join reliably.

## What Changes

- Split a baseplate into a grid of parts that each fit the build volume (from the preview plate size or a printer preset), automatically or with manual cut positions.
- Cuts follow cell boundaries by default; optional cuts through cells are not offered in this change.
- Add edge connectors between parts: end-face holes for pins/screws/magnets plus a selectable dovetail or pin-and-socket option.
- Preview parts separated ("exploded") or assembled, with part labels.
- Export parts individually or all together (hand-off to `09-export-3mf-bambu`).

## Capabilities

### New Capabilities
- `baseplate-split`: dividing a plate into build-volume-sized parts.
- `baseplate-connectors`: edge/end-face joints between parts.

### Modified Capabilities

## Impact

- New `geometry/split.ts`, `geometry/connectors.ts`, `features/baseplate/SplitSection.tsx`, part list in viewport.
- Depends on `05-baseplate-model`.
