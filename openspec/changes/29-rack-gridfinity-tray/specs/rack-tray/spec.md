# Spec Delta

## Purpose
Defines the rack tray generator: a 10-inch rack front plate carrying a Gridfinity baseplate shelf.

## ADDED Requirements

### Requirement: Tray structure
The Tray mode SHALL generate one part consisting of a 10-inch rack front plate (n rack units high with the standard ears, as for panels) and a shelf behind it: a Gridfinity baseplate that fills the width of the 222.25 mm window between the rails and extends behind the plate for a chosen depth. The shelf SHALL be joined to the plate so that the whole is one solid.

#### Scenario: Default tray
- **WHEN** the tray is made with the defaults
- **THEN** the part has a front plate 254 mm wide and the chosen number of units high, and a baseplate behind it five 42 mm cells wide with the remaining width as padding on both sides

#### Scenario: One piece
- **WHEN** the tray is generated
- **THEN** the plate and the shelf form a single connected solid

### Requirement: Gridfinity floor
The shelf SHALL be generated with the same settings and rules as the Baseplate mode: the number of whole cells across the window follows the pitch, the depth is set in units or millimetres, and the base height, floor, rim, padding drop, corner radius and fastener settings are available. The leftover width SHALL be padding placed symmetrically.

#### Scenario: Cells follow the pitch
- **WHEN** the pitch is 42 mm and the window is 222.25 mm
- **THEN** five cells fit across, 210 mm, leaving 12.25 mm of padding, 6.125 mm on each side

#### Scenario: Depth in units
- **WHEN** the depth is set to 4 units
- **THEN** the baseplate is four cells (168 mm) deep behind the plate

#### Scenario: Baseplate options
- **WHEN** the user changes the rim, the base height or the fasteners
- **THEN** the shelf changes as the Baseplate mode's baseplate would

### Requirement: Shelf level and headroom
The user SHALL be able to set how high the shelf sits above the plate's lower edge, and the mode SHALL show the headroom above the baseplate: the plate height above the baseplate surface, in millimetres and in whole Gridfinity height units, so the user sees which bins fit. The shelf SHALL NOT be allowed above the plate's top edge.

#### Scenario: Headroom
- **WHEN** a 2 U plate (88.9 mm) has the shelf flush with its bottom and a base height of 4.65 mm
- **THEN** the headroom is about 84 mm, which is 12 height units of 7 mm

#### Scenario: Shelf too high
- **WHEN** the shelf level would put the baseplate above the top of the plate
- **THEN** an error says so and no model is generated

### Requirement: Tray persistence
The tray settings SHALL be remembered between visits, and corrupt stored data SHALL fall back to defaults.

#### Scenario: Reload
- **WHEN** the user changes the tray settings and reloads
- **THEN** the same settings are restored
