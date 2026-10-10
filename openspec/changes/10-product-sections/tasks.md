# Tasks

## 1. Registry and routes

- [ ] 1.1 `app/products.ts` registry (gridfinity with modes, keychain without); `modes.tsx` mode paths move under `/gridfinity`. Test: registry paths are unique and every mode path starts with its product path.
- [ ] 1.2 `routes.tsx`: new routes, legacy redirects `/box|/baseplate|/cutout` → `/gridfinity/...`, catch-all → `/`. Test: router test for each legacy path, a direct deep link and an unknown path.
- [ ] 1.3 `features/keychain/KeychainMode` placeholder inside `Workspace` using `ComingSoon`; component test that it renders and the viewport mock is mounted.

## 2. Navigation UI

- [ ] 2.1 Product switcher in `Header` (segmented on ≥ md, dropdown on mobile); mode switcher only for products with modes; logo text = active product. Component tests: switcher visible/hidden per product, active state. No artboard for the switcher: build from `SegmentedControl` and the existing mobile select pattern, and say so in the commit.
- [ ] 2.2 Root `StartPage` as product chooser (two cards, keys 1/2) and `ModeChooser` at `/gridfinity` (current cards and keys 1–3). Test: card links, hotkeys, no viewport rendered. Design: `design/artboards/Main.dc.html` for the card style; no artboard for the product level.
- [ ] 2.3 `lastSession` stores `product`; old records default to gridfinity; "Continue" links to the right section. Test: old-shape record, new-shape record, corrupt record.
- [ ] 2.4 i18n en/ru: `products.*`, start page and header strings (names `Gridfinity Master`, `Keychain Master` stay untranslated brand names; descriptions are translated). The key-parity test stays green.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green.
- [ ] 3.2 In the browser, en and ru, desktop and 390 px: root chooser → Gridfinity → each mode; legacy hash links redirect; parameters of baseplate survive a round trip through Keychain; console has no errors.
