# Tasks

## 1. Section control and token

- [x] 1.1 `theme.css`: add `--color-changed` (orange, ≥ 4.5:1 on `surface-1`, distinct from `warn`) and expose it as `text-changed`. Verify: token visible in computed styles in the browser.
- [x] 1.2 `ui/Section.tsx`: remove `defaultOpen` (always starts closed), add `modified` (summary in `text-changed`, localized suffix `common.changed` in the toggle's accessible name); `ui/isChanged.ts` deep-equality helper. Strings in `en.json` and `ru.json`. Component tests: closed on first render, highlighted only with `modified`, accessible name suffix; helper unit tests (nested objects, arrays, number exactness).

## 2. Panels

- [x] 2.1 Gridfinity panels (baseplate: Size, Thickness, Plate, Split, Connectors, Fasteners; box: Size, Walls, Lip, Scoop, Compartments, Fasteners; cutout: Size, Walls, Lip, Cutouts list (no highlight), Properties (no highlight), Placement (no highlight); Export options): drop every `defaultOpen`, pass `modified={isChanged(slice, defaults)}` with the same slice that Reset writes; list/name sections stay unhighlighted. Update affected component tests to expand sections explicitly. Verify: `npm test`; in the browser each mode opens fully collapsed and changing one value highlights only its section, Reset clears it, mm↔in switch changes nothing.
- [ ] 2.2 Keychain panels (image: Image, Silhouette, Size, Relief, Detail, Pattern, Base, Mount, Split, Resolution; shape: Shape, Rim, Size, Pattern, Base, Mount, Split, Resolution): same treatment. Cover the sections that 17–19 added or extended (`ProfileSection` smoothing, `SilhouetteSection` areas, `TextSection`) and give the empty Image mode banner a "Choose image" button (en/ru, test: it triggers the same handler as the section). Verify: `npm test`; in the browser with a stored non-default session both keychain modes open collapsed with the changed sections highlighted, at 390 px width too, in en and ru.

- [ ] 2.3 Start over: `ui/ConfirmDialog`, `onStartOver` in `Workspace` and the button in the panel header strip for all five modes; en/ru strings (`common.startOver`, confirmation title/text/confirm/cancel). Component tests per mode: confirm resets params to defaults and clears highlights, cancel changes nothing, other modes' keys, `gridfinity.export`, language and unit are untouched, keyboard (Esc, focus return) works. Verify in the browser in each mode, at 390 px and in en/ru.

## 3. Start page previews

- [ ] 3.1 `scripts/render-art.ts`: add the keychain image render (synthesised bitmap, no external file) and the shape render; scale computed per product group so the Gridfinity SVGs stay unchanged; write `keychainImage.svg`, `keychainShape.svg`. Verify: `npm run art` produces both files, `git diff` shows no change in the three existing SVGs, each file ≤ 60 KB, the images are legible in the browser.
- [ ] 3.2 Cards: `ART`/`ModeArt` keyed by art id, `artId` on `Product` and `ProductMode`, `StartPage` and `ModeChooser` use `ModeArt` (no Icon as card art). `ModeArt.test.tsx` covers all five ids and the size budget; start page tests check that the Gridfinity card shows the box, that Keychain cards show their renders and that no worker/WebGL is used. Verify in the browser against the existing cards in en/ru and at 390 px.

## 4. Close-out

- [ ] 4.1 `npm test` and `npm run build` are green, dev server console has no errors; update the CLAUDE.md Architecture notes (Section API, Start over, `isChanged`, start page art ids, `npm run art` now also renders keychain parts) and `openspec/ROADMAP.md` (row 21, depends on 16).
