# Proposal

## Why

Two problems with the split connectors from `06-baseplate-split`. The dovetail key floats at mid-height of the wall, so it cannot be printed flat on the bed and the parts cannot be assembled. The end-face holes are far too large for a pin and, at 6 mm deep, reach past the thin wall into the neighbouring socket, so they are effectively through holes.

## What Changes

- Dovetail: key and socket start at the bottom (z = 0), so the key is printed flat on the bed. Key height is configurable (2 mm by default). The socket is open at the bottom face and closed at the top, so one part is lowered onto the other to join them.
- End-face holes are sized for a filament rod: the default preset is 1.75 mm filament (1.9 mm hole); 2 mm and 3 mm pin presets are offered. M3 screw and 6×2 magnet presets stay but are reported as not fitting the wall.
- Hole depth per part is limited to what the wall allows (half the wall width minus the 0.4 mm minimum wall), so a hole never breaks into a pocket. The effective depth is shown next to the setting.
- **BREAKING** The default hole preset changes from M3 to filament (stored settings keep their values; only new settings get the new default).

## Capabilities

### New Capabilities

### Modified Capabilities
- `baseplate-connectors`: dovetail geometry lies on the bed; hole presets and blind, wall-limited holes.

## Impact

- `geometry/connectors.ts` (presets, depth limit, dovetail z-range and fit check), `geometry/baseplate.ts` (no change expected), `features/baseplate/ConnectorsSection.tsx`, i18n files, tests.
- Out of scope: pins longer than the wall allows, vertical (dowel) holes, a printed snap-fit key shape other than the dovetail trapezoid.
- Depends on: `06-baseplate-split` (archived).
