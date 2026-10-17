# rack-panel Specification

## Purpose
Defines the 10-inch rack panel generator: a flat panel of whole rack units with standard mounting holes and an optional through pattern.

## Requirements

### Requirement: Rack panel size
The Panel mode SHALL generate a flat panel for a 10-inch rack, 254 mm wide and n rack units high with n from 1 to 10, where one unit is 44.45 mm. The user SHALL be able to set the thickness, the corner radius and whether a 0.45 mm height tolerance is subtracted from the height so that neighbouring panels fit. All lengths are stored in millimetres.

#### Scenario: Default size
- **WHEN** a 2 U panel is made with the default settings
- **THEN** its bounding box is 254 mm wide and 88.9 mm high less the tolerance, and as thick as set

#### Scenario: Height tolerance
- **WHEN** the tolerance is switched off
- **THEN** the panel is exactly n × 44.45 mm high

#### Scenario: Large panels
- **WHEN** the panel is larger than the selected printer's usable bed
- **THEN** the export panel says it does not fit, as for other modes

### Requirement: Rack mounting holes
The panel SHALL have mounting holes in both ears at the standard 10-inch rack positions: 236.525 mm apart centre to centre, and in every rack unit at 6.35 mm, 22.225 mm and 38.1 mm from the unit's lower edge. The user SHALL be able to choose the hole shape (round or slot), its size, and which positions are used (all three per unit, the outer two per unit, or edges only: the lowest and the highest hole of each ear, four in all, whatever the number of units).

#### Scenario: Standard positions
- **WHEN** the panel is 1 U with all positions
- **THEN** each ear has three holes, 15.875 mm apart, the lowest 6.35 mm from the lower edge, and the two ears are 236.525 mm apart

#### Scenario: Slots
- **WHEN** the shape is slot
- **THEN** the holes are slots with the chosen width and length, centred on the standard positions

#### Scenario: Edges only
- **WHEN** the positions are set to edges only on a panel of any height
- **THEN** each ear has two holes, the lowest 6.35 mm above the lower edge of the first unit and the highest 38.1 mm above the lower edge of the last unit

### Requirement: Through patterns
The panel SHALL offer a through pattern cut in the window between the ears (the 222.25 mm opening between the mounting rails), inset by a margin: IKEA Skadis, hexagons, pills, lines or a plain pass-through opening, or none. Each pattern has its own settings, and the pattern SHALL be turnable by 90°. Only complete pattern elements that fit inside the region SHALL be cut, and the panel SHALL remain one connected piece.

#### Scenario: Skadis slots
- **WHEN** the Skadis pattern is chosen with defaults
- **THEN** the panel has vertical slots 5 mm wide and 15 mm long with rounded ends, 40 mm apart in a row, rows 20 mm apart and every second row shifted by 20 mm

#### Scenario: Hexagons
- **WHEN** the hexagon pattern is chosen with a width and a wall
- **THEN** hexagonal holes of that flat-to-flat width are cut in a honeycomb separated by walls of the chosen thickness

#### Scenario: Pills and lines
- **WHEN** pills or lines are chosen
- **THEN** rounded slots (pills) of the chosen width and height or full-width horizontal slots of the chosen height are cut with walls of the chosen thickness between them

#### Scenario: Pass-through
- **WHEN** the pass-through pattern is chosen
- **THEN** one opening fills the pattern region, with extra solid border of the chosen vertical and horizontal thickness

#### Scenario: Rotation
- **WHEN** the pattern is rotated by 90°
- **THEN** the same pattern is cut turned by a quarter turn inside the region

#### Scenario: One piece
- **WHEN** any pattern is applied
- **THEN** the result is a single connected solid with no loose pieces

#### Scenario: Too thin
- **WHEN** a wall or stroke is below the minimum printable width
- **THEN** a warning says which setting is too small

### Requirement: Back wall
The user SHALL be able to add a back wall: a separate thin part with the same outline and ear holes as the panel, placed behind it, so that a pattern shows another colour behind it. It SHALL be a separate part in the model and export.

#### Scenario: Separate part
- **WHEN** the back wall is on
- **THEN** the model has two parts (panel and back wall) that can be exported as separate objects in a 3MF

#### Scenario: Off
- **WHEN** the back wall is off
- **THEN** only the panel is generated

### Requirement: Rack panel persistence
The panel settings SHALL be remembered between visits and restored, and corrupt stored data SHALL fall back to defaults.

#### Scenario: Reload
- **WHEN** the user changes the panel settings and reloads
- **THEN** the same settings are restored

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
