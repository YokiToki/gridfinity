# Proposal

## Why

The most useful 10-inch rack parts are enclosures: a mini PC, a switch, a router or a power strip that does not come with rack ears. The reference mini-rack generator makes a front plate with ears and a shell around the device, but it runs in the cloud with a queue and no live preview. With panels in place, an enclosure is the front plate plus a shell, and the same product section can offer it.

## What Changes

- **Enclosure mode** in Rack Master (route `/rack/case`, its own card on the Rack chooser). The user enters the width, depth and height of the device, and gets one printable part: a front plate with the standard ears and a shell that wraps the device behind it, open at the back.
- **Automatic height in rack units.** The plate height is the smallest whole number of units that holds the device with the tolerance and wall, shown in the panel; the user can also force a larger number. If the device is too wide for the 222.25 mm window between the rails, an error says by how much.
- **Front window.** An optional opening in the front plate that shows the device's front, with a front lip (how far the plate overlaps the device's edge) so the device cannot slide forward.
- **Keystone jacks.** Optional openings for keystone jacks in the plate (count and placement beside the window), for network ports.
- **Cable holes.** Optional round holes in the plate for a USB or power cable (diameter).
- **Ventilation.** Optional hexagonal vents in the top and side walls, using the hexagon pattern of the panel mode with its own width and wall.
- **Thicknesses and tolerance.** Shell wall thickness, front plate thickness and the gap between the device and the shell (default 0.4 mm), as in the reference generator.
- Everything shares the ear holes and tolerance of the panel mode (positions, slot or round, height tolerance).

## Capabilities

### New Capabilities
- `rack-enclosure`: a 10-inch rack front plate with a shell for a device.

### Modified Capabilities

## Impact

- New `geometry/rack/case.ts` reusing the panel body, ears and hexagon pattern from `26-rack-panels`, `geometry/model.ts` (`rackCase`), `features/rack/` (CaseMode and sections), `app/modes.tsx` (a Rack mode), the Rack chooser card with art `rackCase` (`npm run art`), strings in en and ru, tests.
- Out of scope: a lid or back cover, rails, shelves or screw bosses inside, device-specific presets, fans, multiple devices side by side (a later change can add them), exporting as separate shell and plate parts.
- Depends on: `26-rack-panels` (and its pattern code), `27-rack-panel-kumiko` is not required.
