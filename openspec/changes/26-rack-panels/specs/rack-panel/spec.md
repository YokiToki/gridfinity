# Spec Delta

## Purpose
Defines the 10-inch rack panel generator: a flat panel of whole rack units with standard mounting holes and an optional through pattern.

## ADDED Requirements

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
The panel SHALL have mounting holes in both ears at the standard 10-inch rack positions: 236.525 mm apart centre to centre, and in every rack unit at 6.35 mm, 22.225 mm and 38.1 mm from the unit's lower edge. The user SHALL be able to choose the hole shape (round or slot), its size, and which positions are used (all three per unit, the outer two, or none).

#### Scenario: Standard positions
- **WHEN** the panel is 1 U with all positions
- **THEN** each ear has three holes, 15.875 mm apart, the lowest 6.35 mm from the lower edge, and the two ears are 236.525 mm apart

#### Scenario: Slots
- **WHEN** the shape is slot
- **THEN** the holes are slots with the chosen width and length, centred on the standard positions

#### Scenario: No holes
- **WHEN** the positions are set to none
- **THEN** the ears are solid

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
