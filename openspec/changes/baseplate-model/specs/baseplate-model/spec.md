# Spec Delta

## Purpose
Defines the baseplate generator: footprint, thicknesses, floor style and preview behavior.

## ADDED Requirements

### Requirement: Footprint size
The user SHALL set the baseplate size per axis as decimal units or millimetres; the generator SHALL place whole cells plus padding as defined by fractional sizing and the chosen alignment.

#### Scenario: Integer size
- **WHEN** size is 2×2 units at 42 mm
- **THEN** the plate measures 84×84 mm with four cells and no padding

#### Scenario: Drawer size
- **WHEN** size is 300×200 mm
- **THEN** 7×4 cells are placed, the remaining 6 mm and 32 mm are padding, and the plate measures exactly 300×200 mm

### Requirement: Thickness settings
The user SHALL be able to set base height, floor thickness (0 for open frame), outer rim width and padding thickness, with spec defaults and reset.

#### Scenario: Open frame
- **WHEN** floor thickness is 0
- **THEN** the plate is a through-hole frame of height equal to the base profile height

#### Scenario: Solid floor
- **WHEN** floor thickness is 1.2 mm
- **THEN** each socket has a 1.2 mm floor and total height increases accordingly

### Requirement: Fasteners on baseplate
The baseplate SHALL support magnet and screw holes through the shared fastener settings; enabling any hole kind that requires a floor SHALL add the minimum floor automatically and tell the user.

#### Scenario: Magnets enabled with open frame
- **WHEN** the user enables magnets while floor is 0
- **THEN** the floor is raised to the minimum that holds the magnet and a notice explains why

### Requirement: Build plate preview
The user SHALL be able to show a build plate in the preview with configurable X/Y size, and the app SHALL warn when the model exceeds it.

#### Scenario: Oversize
- **WHEN** the plate model is 300 mm wide and the build plate is 256 mm
- **THEN** a warning is shown and the splitting option is offered

### Requirement: Measurements
The app SHALL show the model's X/Y/Z size in the selected unit and update it on every change.

#### Scenario: Inch readout
- **WHEN** the unit is inch and the plate is 84 mm wide
- **THEN** the readout shows 3.307 in
