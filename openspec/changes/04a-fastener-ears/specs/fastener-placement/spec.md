# Spec Delta

## Purpose
Defines how magnet pockets and screw holes are configured and positioned on generated models.

## MODIFIED Requirements

### Requirement: Holes persisted and exported
The fastener modes, selected positions and dimensions SHALL persist with the mode's parameters, and the holes and their ears SHALL be present in exported files.

#### Scenario: Reload
- **WHEN** the page is reloaded
- **THEN** the fastener modes, selected positions, sizes and ear wall are restored

#### Scenario: Export
- **WHEN** a model with fasteners is exported
- **THEN** the file contains the holes and the ears around them

## ADDED Requirements

### Requirement: Manual position selection
In Manual mode the user SHALL choose which standard cell-corner positions receive a hole, by toggling positions in a 2D view of the footprint. Holes cannot be placed at arbitrary coordinates.

#### Scenario: Toggle on
- **WHEN** the user selects an unused standard position in the 2D view
- **THEN** a hole and its ear are added there and appear in the 3D preview

#### Scenario: Toggle off
- **WHEN** the user selects a position that already has a hole
- **THEN** the hole and its ear are removed

#### Scenario: Keyboard
- **WHEN** the user tabs to a position in the 2D view and presses Enter or Space
- **THEN** that position toggles

#### Scenario: Switch from Full to Manual
- **WHEN** the user switches from Full to Manual
- **THEN** all standard positions stay selected and can be toggled off one by one

#### Scenario: Grid size changes
- **WHEN** the number of cells changes while positions are selected
- **THEN** selections on cells that still exist are kept and selections on removed cells are dropped

### Requirement: Fastener ears
Instead of a full floor, each hole SHALL sit in an ear: a local pad of material around the hole that joins the neighbouring cell walls. The remainder of the cell SHALL stay open through the bottom.

#### Scenario: Full on a 2×2 baseplate
- **WHEN** magnets are set to Full
- **THEN** every hole has its own ear and no cell has a continuous floor

#### Scenario: Cell without holes
- **WHEN** magnets are set to Corner on a 2×2 footprint
- **THEN** the cell corners that carry no hole have no ear, and a cell with no holes at all is open through the bottom

#### Scenario: Manual selection
- **WHEN** only some positions are selected in Manual mode
- **THEN** only those positions have holes and ears

#### Scenario: Ear height
- **WHEN** any hole is present
- **THEN** the pocket bottom and the top of each ear are 4 mm above the underside, and the overall height is 4.65 mm plus 4 mm

#### Scenario: Ear wall
- **WHEN** the user changes the ear wall (1.2 mm by default)
- **THEN** the ear extends that far beyond the hole edge, and the field shows a warning if the ear no longer fits inside the cell

#### Scenario: No holes
- **WHEN** no hole exists, because both kinds are None or Manual has no selected position
- **THEN** the baseplate has no ears and keeps its height of 4.65 mm

### Requirement: Stored settings migration
Stored settings from earlier versions SHALL keep working.

#### Scenario: Stored coordinates
- **WHEN** stored parameters contain manually placed holes as coordinates
- **THEN** each hole within 3 mm of a standard position becomes a selection of that position, and holes farther away are dropped

#### Scenario: Boolean flags stored
- **WHEN** stored parameters contain the prototype's boolean magnets or screws flags set to true
- **THEN** that kind loads as Full

## REMOVED Requirements

### Requirement: Manual placement
**Reason**: Free placement (add by click, drag, exact coordinates) is more than ears need. It is replaced by "Manual position selection", which only toggles standard cell-corner positions.
**Migration**: Stored coordinates snap to the nearest standard position within 3 mm; holes farther away are dropped.
