# Proposal

## Why

The panel generator in `26-rack-panels` has the simple through patterns. The two most distinctive patterns in the reference generator are the asanoha kumiko (a Japanese hemp-leaf lattice) and the Hicks hexagon (the nested-hexagon carpet look). They are what makes a blank panel look designed rather than perforated, and both are harder than a grid of holes: asanoha is a lattice of fine strokes whose gaps become the holes, and the Hicks hexagon must stay one printable piece despite nested outlines.

## What Changes

- **Asanoha kumiko pattern.** A triangular lattice built on hexagons of a chosen width: main strokes (the sides and diagonals of every hexagon) and detail strokes (the Y inside every triangle), each with its own width; a detail width of 0 turns the detail strokes off. The strokes stay as material and the whole openings between them are cut through the panel, so it reads like a kumiko screen.
- **Hicks hexagon pattern.** Hexagon cells in a honeycomb, each drawn as nested hexagon outlines whose strokes are material and whose whitespace is cut through, with a stroke width and a whitespace width, and an option to fill the border of the region with edge cells clipped by it; the result is one connected piece.
- Both follow the existing pattern region, margin and 90° rotation, the thin-feature warnings and the one-piece check of the rack panel.
- The Pattern section of Panel mode lists the two new kinds with their settings.

## Capabilities

### New Capabilities

### Modified Capabilities
- `rack-panel`: two more through patterns.

## Impact

- `geometry/rack/patterns/{asanoha,hicks}.ts`, `features/rack/` Pattern section and migration of the pattern settings, strings in en and ru, tests.
- Out of scope: other kumiko patterns, engraved (not through) patterns, patterns on the back wall.
- Depends on: `26-rack-panels`.
