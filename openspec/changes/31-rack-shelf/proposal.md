# Proposal

## Why

A 10-inch rack often needs a plain shelf: something to stand a router, a power brick or a small box on, in the place of a unit. The enclosure mode wraps a device, the panel mode is flat, and nothing in Rack Master carries a load. A shelf is the simplest useful part: a front plate with the standard ears and a flat slab behind it. It deliberately has nothing to do with Gridfinity, so the two products stay separate.

## What Changes

- **Shelf mode** in Rack Master (route `/rack/shelf`, third card on the Rack chooser, hotkey 3). It generates one part: a rack front plate with the standard ears and a flat shelf behind its lower edge, as wide as the window between the rails less a clearance, and as deep as chosen.
- **Settings:** plate height in rack units (default 2), plate thickness, shelf depth (default 100 mm), shelf thickness (default 3 mm), clearance to the rails (default 0.25 mm each side), plate corner radius, the height tolerance and the ear holes shared with the panel mode.
- **Lips.** Optional raised lips along the left, right and back edges of the shelf (a height and a wall; height 0 turns them off) to keep things from sliding off. The edge at the plate stays open.
- **Print orientation.** The shelf lies flat on the bed and the plate stands at its front edge, so the layers run along the shelf and carry the load; the export needs no flipping.

## Capabilities

### New Capabilities
- `rack-shelf`: a 10-inch rack front plate with a flat shelf.

### Modified Capabilities

## Impact

- New `geometry/rack/shelf.ts` reusing the plate outline and ear holes of `26-rack-panels` (`plateBase`), `geometry/model.ts` (`rackShelf`), `features/rack/` (ShelfMode, sections, migration; the Ears section is shared), `app/modes.tsx` (a Rack mode), a Rack chooser card with art `rackShelf` (`npm run art`), strings in en and ru, tests.
- Out of scope: any Gridfinity baseplate or bins (this replaces the earlier rack-gridfinity-tray idea), gussets and ribs, shelf perforation or ventilation, a shelf above the plate's lower edge, drawers and rails, splitting a deep shelf for small printers.
- Depends on: `26-rack-panels`.
