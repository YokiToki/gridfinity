# Design

## Context

`routes.tsx` lists three flat mode routes; `modes.tsx` holds `MODES`; `Header` renders the mode switcher unconditionally for non-start pages; `StartPage` renders mode cards and a "Continue" chip from `lastSession` (`gridfinity.last`). Workspace (panel + sticky footer + viewport, bottom drawer under 768 px) is already mode-agnostic.

## Goals / Non-Goals

**Goals:** a second product with zero behavioural change for Gridfinity; adding a third product later = one registry entry plus routes.
**Non-Goals:** keychain functionality; a visual redesign; per-product themes.

## Decisions

- **Product registry:** `app/products.ts` exports `PRODUCTS: {id: 'gridfinity'|'keychain', path, Icon, modes?: Mode[]}`. `MODES` moves under the Gridfinity product; mode paths become `/gridfinity/<mode>`. Header, StartPage and routes read the registry.
- **Routes:** `/` start (products), `/gridfinity` (mode chooser, the current StartPage body extracted as `ModeChooser`), `/gridfinity/{box,baseplate,cutout}`, `/keychain`. Legacy paths are `<Navigate replace>` elements to the new ones; the catch-all goes to `/`.
- **Header:** product switcher (SegmentedControl on ≥ md; `details` select on mobile, same pattern as `MobileModeSelect`), then the mode switcher only when the active product has modes. The logo text becomes the active product name (`Gridfinity Master` / `Keychain Master`), `Logo` stays.
- **Last session:** `LastSession` gains `product`; old records without it are read as `gridfinity`. The key stays `gridfinity.last`, so nothing is lost for existing users.
- **State namespaces:** existing keys untouched; Keychain uses `keychain.<what>`. Language and unit keys stay global.
- **Keychain placeholder:** `features/keychain/KeychainMode` renders `ComingSoon` inside `Workspace` until `11-keychain-relief` replaces it.
- **No artboard** exists for the product chooser. Build it from `ui/` components and `theme.css` tokens, reusing the mode-card styling, and note it in the task.

## Risks / Trade-offs

- Changing URLs could break bookmarks → legacy redirects cover them; covered by a routing test.
- `ModeId` is also used in `lastSession` and `model.ts`; the geometry `ModeId` (`ModeParams` keys) stays separate from UI route ids to avoid coupling the worker to routing.
