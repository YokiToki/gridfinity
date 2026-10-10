# Proposal

## Why

Two problems with the split connectors from `06-baseplate-split`. The dovetail key floats at mid-height of the wall, so it cannot be printed flat on the bed and the parts cannot be assembled. The end-face holes are drilled into the thin wall along the cut, are far too large for a pin and, at 6 mm deep, reach past the wall into the neighbouring socket, so they are effectively through holes.

## What Changes

- Dovetail: key and socket start at the bottom (z = 0), so the key is printed flat on the bed. Key height is configurable (2 mm by default). The socket is open at the bottom face and closed at the top, so one part is lowered onto the other to join them.
- End-face holes move to the **ends of the ribs that meet the cut**: the hole is drilled along the rib, into its end face, in both parts. The rib is 4.3 mm wide and runs a full cell, so the hole fits and can be a normal 6 mm deep without reaching any socket.
- Holes are sized for a filament rod: the default preset is 1.75 mm filament (1.9 mm hole); 2 mm and 3 mm pin presets are offered. A 3×2 mm disc magnet preset (hole 3.1 mm, 2.1 mm deep) and an M3 screw preset are offered; anything wider than the rib allows, such as a custom 6 mm hole, is reported as not fitting.
- Positions are the rib ends along the cut face (cell boundaries inside the face), chosen as close as possible to the evenly spaced positions from count and inset. A face with no rib end (a one-cell-wide face) gets no hole and the user is told why; the dovetail stays available there.
- Hole depth per part is limited by the length of the part, not by the wall; the effective depth is shown next to the setting.
- **BREAKING** The default hole preset changes from M3 to filament (stored settings keep their values; only new settings get the new default).

## Capabilities

### New Capabilities

### Modified Capabilities
- `baseplate-connectors`: dovetail geometry lies on the bed; hole presets and blind, wall-limited holes.

## Impact

- `geometry/connectors.ts` (presets, depth limit, dovetail z-range and fit check), `geometry/baseplate.ts` (no change expected), `features/baseplate/ConnectorsSection.tsx`, i18n files, tests.
- Out of scope: holes along the cut face (the old placement), vertical dowel holes, a snap-fit key shape other than the dovetail trapezoid, holes in the outer edge wall of the plate.
- Depends on: `06-baseplate-split` (archived).
