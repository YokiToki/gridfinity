# Spec Delta

## ADDED Requirements

### Requirement: Asanoha pattern
The panel SHALL offer an asanoha kumiko pattern cut through the panel: a lattice of equilateral triangles built on hexagons of a chosen flat-to-flat width, whose strokes stay as material — main strokes (the hexagon sides and diagonals) and detail strokes (three lines from the centre of every triangle to its corners), each with its own stroke width — and whose openings between the strokes are cut through. A detail stroke width of 0 SHALL switch the detail strokes off. Only whole openings that lie inside the pattern region SHALL be cut, and the panel SHALL remain one connected piece.

#### Scenario: Main and detail strokes
- **WHEN** the pattern is chosen with both stroke widths above zero
- **THEN** the openings between the strokes of a triangular lattice of the chosen hexagon width are cut, each triangle split into three by its detail strokes

#### Scenario: Detail off
- **WHEN** the detail stroke width is 0
- **THEN** the openings are whole triangles bounded by the main strokes

#### Scenario: Wider strokes
- **WHEN** a stroke width is increased
- **THEN** the strokes stay material and the openings become smaller

#### Scenario: One piece
- **WHEN** the pattern is applied with any allowed settings
- **THEN** the result is a single connected solid

#### Scenario: Rotation and region
- **WHEN** the pattern is rotated by 90° or the margin changes
- **THEN** the lattice stays inside the pattern region and turns as a whole

#### Scenario: Too fine
- **WHEN** a stroke width in use is below the minimum printable width
- **THEN** a warning names the setting

### Requirement: Hicks hexagon pattern
The panel SHALL offer a Hicks hexagon pattern: hexagon cells in a honeycomb, each drawn as nested hexagonal outlines of a chosen stroke width, with a chosen whitespace width cut through between them, so that the panel keeps its strength and stays one connected piece. An option SHALL add edge cells: the cells that only touch the pattern region are drawn too, clipped by the region, so the pattern fills the region up to its border.

#### Scenario: Stroke and whitespace
- **WHEN** the stroke width or the whitespace width is changed
- **THEN** the nested outlines and the cut gaps follow, and the cut gaps are exactly the whitespace width

#### Scenario: Edge cells
- **WHEN** the edge cells option is on
- **THEN** partial cells along the border of the region are drawn clipped by the region, and the whole cells are the same as with the option off

#### Scenario: Edge cells off
- **WHEN** the edge cells option is off
- **THEN** only whole cells inside the region are drawn

#### Scenario: One piece
- **WHEN** the pattern is applied with any allowed settings, with or without edge cells
- **THEN** the result is a single connected solid, with no island held by nothing

#### Scenario: Too fine
- **WHEN** the stroke or whitespace is below the minimum printable width
- **THEN** a warning names the setting
