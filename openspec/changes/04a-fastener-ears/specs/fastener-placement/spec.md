# Spec Delta

## Purpose
Defines how magnet pockets and screw holes are configured and positioned on generated models.

## MODIFIED Requirements

### Requirement: Placement modes
Magnets and screw holes SHALL each support the modes None, Corner and Full.

#### Scenario: Full
- **WHEN** magnets are set to Full on a 2×2 footprint
- **THEN** every cell receives holes at its four standard positions (13 mm from the cell centre on both axes)

#### Scenario: Corner
- **WHEN** magnets are set to Corner on a 2×2 footprint
- **THEN** only the four outermost cell corners of the footprint receive holes

#### Scenario: None
- **WHEN** screws are set to None
- **THEN** no screw holes are generated

### Requirement: Holes persisted and exported
The fastener mode and dimensions SHALL persist with the mode's parameters, and the holes and their ears SHALL be present in exported files.

#### Scenario: Reload
- **WHEN** the page is reloaded
- **THEN** the fastener modes, sizes and ear wall are restored

#### Scenario: Export
- **WHEN** a model with fasteners is exported
- **THEN** the file contains the holes and the ears around them

## ADDED Requirements

### Requirement: Fastener ears
Instead of a full floor, each hole SHALL sit in an ear: a local pad of material around the hole that joins the neighbouring cell walls. The remainder of the cell SHALL stay open through the bottom.

#### Scenario: Full on a 2×2 baseplate
- **WHEN** magnets are set to Full
- **THEN** every hole has its own ear and no cell has a continuous floor

#### Scenario: Cell without holes
- **WHEN** magnets are set to Corner on a 2×2 footprint
- **THEN** the cell corners that carry no hole have no ear, and a cell with no holes at all is open through the bottom

#### Scenario: Ear height
- **WHEN** any hole kind is enabled
- **THEN** the pocket bottom and the top of each ear are 4 mm above the underside, and the overall height is 4.65 mm plus 4 mm

#### Scenario: Ear wall
- **WHEN** the user changes the ear wall (1.2 mm by default)
- **THEN** the ear extends that far beyond the hole edge, and the field shows a warning if the ear no longer fits inside the cell

#### Scenario: No fasteners
- **WHEN** both magnets and screws are None
- **THEN** the baseplate has no ears and keeps its height of 4.65 mm

### Requirement: Stored settings migration
Stored settings from earlier versions SHALL keep working.

#### Scenario: Manual placement stored
- **WHEN** stored parameters contain Manual placement
- **THEN** that kind loads as Full

#### Scenario: Boolean flags stored
- **WHEN** stored parameters contain the prototype's boolean magnets or screws flags set to true
- **THEN** that kind loads as Full

## REMOVED Requirements

### Requirement: Manual placement
**Reason**: Manual placement is not needed now. It added a 2D editor and could create holes inside solid material, and ears are only defined around the standard positions.
**Migration**: Stored manual placements load as Full.
