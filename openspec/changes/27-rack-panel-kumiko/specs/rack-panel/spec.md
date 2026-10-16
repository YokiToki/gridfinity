# Spec Delta

## ADDED Requirements

### Requirement: Asanoha pattern
The panel SHALL offer an asanoha kumiko pattern engraved into the front face: a lattice of equilateral triangles built on hexagons of a chosen flat-to-flat width, drawn with main strokes (the hexagon sides and diagonals) and detail strokes (three lines from the centre of every triangle to its corners), each set with its own stroke width and its own engraving depth. A depth of 0 SHALL switch that set of strokes off. The panel SHALL stay unperforated and keep its full outline.

#### Scenario: Main and detail strokes
- **WHEN** the pattern is chosen with both depths above zero
- **THEN** both stroke sets are engraved to their own depths on a triangular lattice of the chosen hexagon width

#### Scenario: Depth zero
- **WHEN** the detail depth is 0
- **THEN** only the main strokes are engraved

#### Scenario: Depth limit
- **WHEN** an engraving depth is larger than the panel thickness minus the minimum wall
- **THEN** a warning is shown and the depth used is limited to the thickness minus the minimum wall

#### Scenario: Rotation and region
- **WHEN** the pattern is rotated by 90° or the margin changes
- **THEN** the lattice stays inside the pattern region and turns as a whole

### Requirement: Hicks hexagon pattern
The panel SHALL offer a Hicks hexagon pattern: hexagon cells in a honeycomb, each drawn as nested hexagonal outlines of a chosen stroke width, with a chosen whitespace width cut through between them, so that the panel keeps its strength and stays one connected piece.

#### Scenario: Stroke and whitespace
- **WHEN** the stroke width or the whitespace width is changed
- **THEN** the nested outlines and the cut gaps follow, and the cut gaps are exactly the whitespace width

#### Scenario: One piece
- **WHEN** the pattern is applied with any allowed settings
- **THEN** the result is a single connected solid, with no island held by nothing

#### Scenario: Too fine
- **WHEN** the stroke or whitespace is below the minimum printable width
- **THEN** a warning names the setting
