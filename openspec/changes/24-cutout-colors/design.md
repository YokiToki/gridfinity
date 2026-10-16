# Design

## Context

The cutting tools reach the viewport as `ModelResult.tools: { id, name, mesh }[]` and `Viewport` paints every one with the single `TOOL_COLOR` (cyan, opacity 0.45). `TopView` fills shapes with `--color-surface-3` (selected: `--color-accent`). The list rows in `CutoutPanel` show only the name and buttons. All palette colours in the app are tokens in `app/theme.css`; three.js code has its own hex values only for parts (`PART_STYLES`).

## Goals / Non-Goals

**Goals:**
- One colour per cutout, identical in list, top view and 3D view, stable under reorder and delete.
- No ad-hoc colours: the palette is theme tokens.

**Non-Goals:**
- Manual colour choice, colours in exported files, colouring other modes.

## Decisions

- **Stored palette index.** `Cutout.color: number` (0–6) is stored with the cutout. Assigned in `addCutout` and `duplicateCutout` as the lowest index not used by the list, or `list.length % 7` when all are used. Alternatives: colour by list position (recolours on reorder or delete, which breaks the "same shape, same colour" idea), colour from a hash of the id (collisions between neighbours, no guarantee of distinct colours).
- **Palette: 7 tokens `--color-cutout-0…6`** in `theme.css`, an Okabe–Ito-based set (orange, sky blue, bluish green, yellow, blue, vermillion, reddish purple), each checked for at least 3:1 contrast against `--color-surface-1`. This is the standard colour-blind-safe set, and with swatch plus name plus selection outline, colour is never the only cue. A helper `cutoutColorVar(i)` returns `var(--color-cutout-<i % 7>)`.
- **Tool colour in 3D.** `ToolMesh` gets `color: number` (the palette index); `buildCutoutTools` copies it from the cutout, so the worker needs no CSS. `Viewport` resolves the index to a colour once per tool build by reading the token with `getComputedStyle(document.documentElement)` and `THREE.Color`, so the theme file stays the only place that defines colours. Alternative: duplicate hex values in the viewport. Rejected: two sources of truth.
- **TopView.** Shape `fill` = the cutout colour at low opacity (0.35, selected 0.6), `stroke` = the colour (selected: wider, plus the existing dashed accent box). Alternative: keep grey fills and add only an outline. Rejected: the fill is what the eye finds.
- **List swatch.** A 12 px rounded square before the name in each row, `aria-hidden` (the name is the accessible label; the colour is decorative).
- **Migration.** `migrateCutout` fills a missing or invalid `color` in list order using the same rule, so old sessions get distinct colours and nothing else changes.

## Risks / Trade-offs

- [Yellow on a light fill can look washed out] → the app is dark-themed; the palette is chosen for that and contrast-checked in a test against the token values.
- [Duplicates repeat colours beyond 7 cutouts] → accepted; names and selection still identify; 7 covers typical use.
- [`getComputedStyle` in tests (jsdom) returns empty strings] → the viewport is mocked in component tests; a unit test covers the palette helper and the fallback colour when the token is empty.
