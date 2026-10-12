# Proposal

## Why

Parameter panels open with half of their sections expanded, so the panel is long and the user has to scroll to find a section, and nothing tells which settings were already changed from their defaults. The start page also does not match the rest of the app: the Gridfinity product card shows a generic icon and the Keychain cards show icons instead of renders of the real parts.

## What Changes

- **All settings sections start collapsed** in every mode (Gridfinity box, baseplate, cutout; Keychain image, shape; export options). Sections no longer open themselves because a feature is on (split, connectors, build plate); expanding is always a user action. The open/closed state is not persisted.
- **Changed values are highlighted.** The value shown opposite the section label (the section summary) is drawn in an orange accent when the section's settings differ from their defaults, and in the usual muted colour when they equal the defaults, so a collapsed panel shows at a glance which blocks were touched. Sections whose summary is not a setting (the image file name, the cutout list, the selected cutout name) are never highlighted.
- **New theme token** `--color-changed` (orange, distinct from the yellow warning colour and from the blue accent) in `theme.css`.
- **Start over button in every mode.** Each mode panel (box, baseplate, cutout, keychain image, keychain shape) gets a "Start over" button that returns all parameters of that mode to their defaults after a confirmation. It resets only the mode's own parameters: other modes, language, units and export settings stay, and imported files (cutout meshes, keychain image) are kept in storage but removed from the model. The button is in the sticky panel footer's header area so it is reachable with every section collapsed.
- **Gridfinity product card** on the root start page shows the box render (the existing `box.svg`) instead of the grid icon.
- **Keychain previews are generated.** `npm run art` also renders two keychain parts from the real keychain pipeline, an image-mode keychain and a shape-mode keychain, as isometric SVG. The Keychain product card uses the image render; the Image and Shape mode cards use their own render. No sample file is needed: the image-mode source is a bitmap drawn by the script.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: the collapsible section control (collapsed by default, summary highlighting for non-default values) and the start page illustrations (product cards and Keychain mode cards).

## Impact

- `app/Workspace.tsx` (Start over button, confirm dialog), each mode's `defaults`/`reset` wiring, `ui/Section.tsx` (new `modified` prop, default closed, `defaultOpen` removed), every section component under `features/*` (compute "differs from defaults" from the params they already own and the defaults they use for Reset), `app/theme.css`, `app/ModeArt.tsx`, `app/StartPage.tsx`, `app/ModeChooser.tsx`, `scripts/render-art.ts`, new `src/app/art/{keychainImage,keychainShape}.svg`, tests, `CLAUDE.md` Architecture notes.
- Out of scope: remembering which sections the user opened, "expand all / collapse all" buttons, a counter of changed sections in the panel header, undo of Start over, resetting several modes at once, changing what is stored or generated for the models.
- Depends on: `16-keychain-shape-mode` (the shape mode exists). Independent of 17–20, but it touches the same panels, so take it after the earlier-numbered changes that are in progress or archive-merge conflicts will be on you.
