# Proposal

## Why

A 10-inch rack is a good place for small parts organisation: a shelf or drawer front that holds Gridfinity bins keeps screws, tools and cables next to the rack. The pieces already exist in this app: the rack front plate and the Gridfinity baseplate generator. A tray mode joins them, so the user does not model the shelf by hand and the bins in the tray are the same bins the Box mode makes.

## What Changes

- **Tray mode** in Rack Master (route `/rack/tray`, third card on the Rack chooser). It generates one part: a rack front plate with the standard ears and, behind it, a Gridfinity baseplate shelf that fills the width between the rails and extends back for the chosen depth.
- **Gridfinity floor.** The shelf is a baseplate from the existing baseplate model: as many whole cells as fit the 222.25 mm window (five 42 mm cells, 210 mm, with the leftover as padding on both sides), and the depth is chosen in units or millimetres. The baseplate's own settings (base height, floor, rim around the plate, how far the padding is dropped, corner radius, pitch, and the fastener settings) are offered as in the Baseplate mode.
- **Plate height and shelf level.** The front plate is n rack units high; the shelf sits at a chosen height above the plate's lower edge (default flush with the bottom). The panel shows the clearance above the baseplate in millimetres and in Gridfinity height units, so the user sees which bins fit.
- **Tolerances** are those of the rack panel (height tolerance, ear holes).

## Capabilities

### New Capabilities
- `rack-tray`: a 10-inch rack front plate with a Gridfinity baseplate shelf.

### Modified Capabilities

## Impact

- New `geometry/rack/tray.ts` composing the existing baseplate builder (`buildBaseplate`, `baseplateLayout`) and the rack plate from `26-rack-panels`, `geometry/model.ts` (`rackTray`), `features/rack/` (TrayMode and sections, reusing the baseplate thickness and fastener sections), `app/modes.tsx`, Rack chooser card with art `rackTray` (`npm run art`), strings in en and ru, tests.
- Out of scope: splitting a deep tray into parts for small printers (the baseplate split can be added later), drawer rails or sliding mechanisms, tray side walls and a back wall beyond the baseplate rim, bins inside the tray (made in Box mode).
- Depends on: `26-rack-panels`, `05-baseplate-model`, `04-fastener-placement`.
