# box-model Specification

## Purpose
Defines the Box/Tray generator: footprint, height, walls, lip, scoop, compartments and bottom features.

## Requirements

### Requirement: Footprint and height
The user SHALL set X and Y size as decimal units or millimetres and height in 7 mm units or millimetres; the bin's outer footprint SHALL equal the requested size minus the standard 0.5 mm clearance.

#### Scenario: Standard bin
- **WHEN** size is 2×2 units and height 3 units
- **THEN** the bin is 83.5×83.5 mm and 21 mm tall (excluding lip if lip is None)

#### Scenario: Non-multiple footprint
- **WHEN** X is 100 mm
- **THEN** two feet columns are generated, the remaining width is a flat floor, and the outer width is 99.5 mm

### Requirement: Lip style
The bin SHALL support lip styles Default, Thin and None; the UI SHALL explain that the lip lets bins stack by mating with the foot of the bin above.

#### Scenario: None
- **WHEN** lip style is None
- **THEN** the top of the walls is flat at the bin height

#### Scenario: Default
- **WHEN** lip style is Default
- **THEN** the walls end in the standard stacking profile and total height increases by the lip height

### Requirement: Walls and floor thickness
The user SHALL configure outer wall, inner (divider) wall and floor thickness with spec defaults and reset; settings that leave no cavity SHALL be rejected with a message.

#### Scenario: Thicker walls
- **WHEN** outer wall is set to 2.4 mm
- **THEN** the cavity shrinks by 2.4 mm per side relative to the outer shell

#### Scenario: No cavity
- **WHEN** walls plus floor leave no interior
- **THEN** a validation error is shown and the last valid model is kept

### Requirement: Scoop
The user SHALL be able to enable an inner finger scoop on any combination of the four sides with a configurable radius.

#### Scenario: Front scoop
- **WHEN** scoop is enabled on the front side with radius 10 mm
- **THEN** the cavity floor along that side has a 10 mm concave fillet

#### Scenario: Radius too large
- **WHEN** the radius exceeds the cavity height
- **THEN** it is clamped and a notice is shown

### Requirement: Compartments
The user SHALL split the cavity into compartments using a grid (columns × rows) with equal division, and SHALL be able to merge and move dividers by editing a 2D layout.

#### Scenario: Equal grid
- **WHEN** columns is 3 and rows is 2
- **THEN** three divider walls (two between columns, one between rows) of the inner wall thickness produce six equal compartments

#### Scenario: Merge
- **WHEN** the user merges two adjacent compartments
- **THEN** the divider between them is removed

### Requirement: Bottom fasteners
The bin SHALL support magnet and screw holes in the foot through the shared fastener settings.

#### Scenario: Magnets
- **WHEN** magnets are set to Full
- **THEN** each foot has four magnet pockets in the base and the model remains a valid solid
