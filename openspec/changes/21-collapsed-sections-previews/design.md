# Design

## Context

`ui/Section.tsx` has `defaultOpen` (default `true`) and an optional `summary` string rendered muted on the right of the header. About half of the sections already pass `defaultOpen={false}`; some compute it from state (`s.enabled`, `c.type !== 'none'`, `preview.showPlate`). Each section component owns the params it edits and already knows its defaults (they are what Reset writes). The summary strings are built per section and are sometimes unit-dependent. The start page cards use `ModeArt` (`?raw` SVG per `ModeId`) for Gridfinity modes and a Tabler icon for everything else; `scripts/render-art.ts` builds the three Gridfinity renders from `generate()` and needs `tmp/cutout.stl`.

## Goals / Non-Goals

**Goals:** a uniformly collapsed panel; a cheap, reliable "differs from defaults" signal per section; keychain renders produced by the same pipeline as the Gridfinity ones, reproducibly.

**Non-Goals:** persisting the open state; any change to params, stored shapes or geometry.

## Decisions

- **`Section` API.** Remove `defaultOpen`; the section is always initially closed. Add `modified?: boolean`; when true the summary gets `text-changed` (new token) instead of `text-text-subtle`, and the toggle's `aria-label` gets a localized suffix (`common.changed`) so colour is not the only carrier. Alternative: let `Section` compare `value` to `defaults` itself. Rejected: it would need every section to pass both objects anyway, and several sections compare a subset (e.g. Shape keeps `rim` when resetting).
- **Computing `modified`.** A pure helper `isChanged(value, defaults)` in `ui/` (structural deep equality on plain JSON-like objects, numbers compared exactly, arrays by element) used in each section as `modified={isChanged(x, defaultX)}`, using exactly the same slice that Reset writes, so "Reset makes it not highlighted" holds by construction. Comparison is on stored mm values, never on formatted strings, so unit switching cannot change it. Alternative: compare formatted summaries to the default summary. Rejected: breaks with units and language.
- **Sections that mix concerns** (box Size: pitch, x, y, height; baseplate Plate: preview-only values; Fasteners: per-kind modes) compare the whole slice they edit. Preview-only values (build plate) count as settings of their section. Sections without defaults (image name, cutout list, selected cutout, export options file name) do not pass `modified`. The Export options section highlights when its stored settings differ from `defaultExportSettings`, excluding nothing.
- **Token.** `--color-changed: #f0944a` (orange) with a contrast of at least 4.5:1 on `--color-surface-1`; distinct in hue from `--color-warn` (#e5b04b, yellow) used for warnings and from the blue `--color-accent`. Tailwind exposes it as `text-changed`.
- **Cards.** `ART` is keyed by an art id instead of `ModeId`: `box | baseplate | cutout | keychainImage | keychainShape`. `ModeArt` takes that id. `StartPage` maps product → art id (`gridfinity → box`, `keychain → keychainImage`) with a field `artId` on `Product`; `ModeChooser` uses `artId` on `ProductMode` and no longer branches on the product. The Icon stays in the type for the header switchers.
- **Keychain renders.** `render-art.ts` gets two more models via `generate('keychain', …)`: image mode from a bitmap synthesised in the script (a filled shield/star with a hole drawn with a few lines of pure maths into a `GrayImage`, no file on disk, so the script no longer fails for these two when `tmp/cutout.stl` is missing; the cutout step still requires it) with a small bevel profile and a ring hole mount; shape mode from a rounded rectangle or capsule with `rim` and a ring hole. The common scale is computed over all five models, so the Gridfinity images must be regenerated and committed too (they change slightly). Quality is chosen so each file stays under the 60 KB budget in `ModeArt.test.tsx`. The tone-image pipeline is reused unchanged.

- **Start over.** `Workspace` gets an optional `onStartOver` prop; each mode passes `() => setState(defaults)` using the same defaults object that `usePersistedState` falls back to, so the persisted key is rewritten with defaults and nothing else. The button (`Button`, secondary, icon `IconRestore`) sits in the panel header strip above the sections; it asks for confirmation through a small `ui/ConfirmDialog` (Esc / outside click cancel, focus returns to the button), because the action is not undoable. Export settings (`gridfinity.export`) are shared across modes and intentionally untouched. Cutout and keychain-image modes also clear their references to stored meshes/images (`meshId`, `imageId`), and the stored blobs are left to the existing cleanup. Alternative: instant reset plus an undo toast. Rejected for now: needs an undo history the app does not have.

## Risks / Trade-offs

- [Regenerating the three Gridfinity SVGs because the shared scale changes] → compute the scale per product group (Gridfinity three, Keychain two), so existing files stay byte-identical; check the diff.
- [Keychain relief at illustration size renders as noise] → pick a bold synthetic shape and bevel profile; judge the result in the browser before committing.
- [Start over loses work by mistake] → confirmation dialog naming the mode; button is secondary, not primary.
- [Existing component tests assume sections open] → update them to expand explicitly via a shared test helper; this is the main churn.
- [A user with a stored split/connectors/plate no longer sees those controls on load] → the summary says "on"/values and is highlighted, which is the cue.
