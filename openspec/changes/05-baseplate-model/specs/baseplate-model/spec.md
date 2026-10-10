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
The user SHALL be able to set base (profile) height, floor thickness (0 for open frame), outer rim width, how far the padding sits below the rim (0 for flush) and the outer corner radius, with spec defaults, reset and a localized message next to any invalid value; while a value is invalid the previous valid model stays displayed.

#### Scenario: Open frame
- **WHEN** floor thickness is 0
- **THEN** the plate is a through-hole frame of height equal to the base profile height

#### Scenario: Lowered padding
- **WHEN** the plate has leftover padding and the padding is lowered by 2 mm
- **THEN** the padding surface is 2 mm below the rim and the cells and the rim keep their height

#### Scenario: Invalid value
- **WHEN** the user enters a profile height below the standard 4.65 mm
- **THEN** the field shows a message, the preview keeps the last valid model and export is disabled until the value is fixed

#### Scenario: Solid floor
- **WHEN** floor thickness is 1.2 mm
- **THEN** each socket has a 1.2 mm floor and total height increases accordingly

### Requirement: Fasteners on baseplate
The baseplate SHALL support magnet and screw holes through the shared fastener settings. Holes sit in ears (local pads) rather than a full floor, and enabling fasteners SHALL NOT change the floor thickness setting.

#### Scenario: Magnets enabled with open frame
- **WHEN** the user enables magnets while floor thickness is 0
- **THEN** each hole has an ear, the rest of every cell stays open through the bottom, and the floor thickness field still reads 0

#### Scenario: Magnets enabled with solid floor
- **WHEN** the user enables magnets while floor thickness is 1.2 mm
- **THEN** the cells keep a 1.2 mm floor and the ears rise from it to the pocket bottom

#### Scenario: Floor thicker than the ears
- **WHEN** floor thickness is at least as large as the ear height
- **THEN** the floor absorbs the ears and the plate has a continuous floor of that thickness

### Requirement: Build plate preview
The user SHALL be able to show a build plate in the preview with configurable X/Y size, and the app SHALL warn when the model exceeds it.

#### Scenario: Oversize
- **WHEN** the plate model is 300 mm wide and the build plate is 256 mm
- **THEN** a warning states both sizes and suggests reducing the size or splitting the plate into parts (the split itself is provided by `06-baseplate-split`)

### Requirement: Measurements
The app SHALL show the model's X/Y/Z size in the selected unit and update it on every change.

#### Scenario: Inch readout
- **WHEN** the unit is inch and the plate is 84 mm wide
- **THEN** the readout shows 3.307 in
