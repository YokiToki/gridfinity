# Spec Delta

## Purpose
Defines the rack enclosure generator: a 10-inch rack front plate with a shell that holds a device.

## ADDED Requirements

### Requirement: Enclosure size
The Enclosure mode SHALL generate one part from the device's width, depth and height, a gap between the device and the shell, a shell wall thickness and a front plate thickness: a 10-inch rack front plate with the standard ears (as for panels) and a shell behind it that surrounds the device on the top, bottom and sides, open at the back. The plate height SHALL be the smallest whole number of rack units that contains the shell and the height tolerance, shown to the user, and the user MAY choose a larger number of units.

#### Scenario: Automatic units
- **WHEN** a device 120 mm high is entered with a 0.4 mm gap and 2 mm walls
- **THEN** the shell is about 128.8 mm high and the plate is 3 U high (133.35 mm less the tolerance), and the count is shown

#### Scenario: Forced units
- **WHEN** the user sets more units than needed
- **THEN** the plate is that many units high and the shell stays centred on the plate

#### Scenario: Too wide
- **WHEN** the device plus gap and walls is wider than the 222.25 mm window between the rails
- **THEN** an error states how many millimetres too wide it is and no model is generated

#### Scenario: Shell depth
- **WHEN** the depth is set
- **THEN** the shell extends behind the front plate by the device depth plus the gap

### Requirement: Front window
The front plate SHALL have an optional window that shows the device's front face: the device's width and height reduced on every side by a front lip chosen by the user, so the plate overlaps the device's edge by that amount.

#### Scenario: Lip
- **WHEN** the window is on with a 3 mm lip
- **THEN** the window is 6 mm narrower and 6 mm lower than the device

#### Scenario: No window
- **WHEN** the window is off
- **THEN** the front plate is closed

### Requirement: Front plate extras
The user SHALL be able to add keystone jack openings to the front plate (a count and a position beside or below the window) and round cable holes of a chosen diameter. Openings SHALL stay inside the plate, clear of the ears, the window and each other, otherwise a message says which one does not fit.

#### Scenario: Keystones
- **WHEN** two keystones are added
- **THEN** two keystone openings of the standard size are cut in the front plate beside the window

#### Scenario: Overlap
- **WHEN** an opening would overlap the window or an ear hole
- **THEN** a message names it and it is not cut

### Requirement: Ventilation
The user SHALL be able to add hexagonal vents to the top and side walls of the shell with their own hexagon width and wall thickness; the shell SHALL keep its structure (vents only in the free wall area, away from the edges and the plate).

#### Scenario: Vents on
- **WHEN** vents are enabled
- **THEN** the top and both side walls have hexagonal holes of the chosen size, none within a margin of the edges

#### Scenario: Strength
- **WHEN** the vent wall is below the minimum printable width
- **THEN** a warning names the setting

### Requirement: Enclosure persistence
The enclosure settings SHALL be remembered between visits, and corrupt stored data SHALL fall back to defaults.

#### Scenario: Reload
- **WHEN** the user changes the enclosure settings and reloads
- **THEN** the same settings are restored
