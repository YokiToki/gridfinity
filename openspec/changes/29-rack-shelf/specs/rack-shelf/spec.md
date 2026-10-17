# Spec Delta

## Purpose
Defines the rack shelf generator: a 10-inch rack front plate with a flat shelf behind its lower edge.

## ADDED Requirements

### Requirement: Shelf structure
The Shelf mode SHALL generate one part consisting of a 10-inch rack front plate (n rack units high with the standard ears, as for panels) and a flat shelf behind it, joined to the plate so that the whole is one solid. The shelf's underside SHALL be flush with the plate's lower edge. The user SHALL be able to set the number of units, the plate thickness, the shelf depth and the shelf thickness; the plate corner radius, height tolerance and ear holes are the panel's.

#### Scenario: Default shelf
- **WHEN** the shelf is made with the defaults
- **THEN** the part has a 254 mm wide plate 2 U high less the tolerance, and a shelf behind its lower edge that is 3 mm thick and 100 mm deep

#### Scenario: One piece
- **WHEN** the shelf is generated
- **THEN** the plate and the shelf form a single connected solid

#### Scenario: Ears
- **WHEN** the ear settings are changed
- **THEN** the holes in the plate follow them as in the panel mode

### Requirement: Shelf width
The shelf SHALL be as wide as the window between the rails (222.25 mm) less a clearance on each side chosen by the user (default 0.25 mm), centred on the plate.

#### Scenario: Default width
- **WHEN** the clearance is 0.25 mm
- **THEN** the shelf is 221.75 mm wide, centred between the rails

#### Scenario: Clearance
- **WHEN** the clearance is changed
- **THEN** the shelf width changes by twice the change and stays centred

### Requirement: Shelf lips
The user SHALL be able to add raised lips along the left, right and back edges of the shelf, with a chosen height and wall thickness; a height of 0 SHALL switch them off. The edge next to the plate SHALL stay open.

#### Scenario: Lips on
- **WHEN** the lip height is 6 mm and the wall is 2 mm
- **THEN** a 2 mm wall rises 6 mm above the shelf along the left, right and back edges, and not along the plate

#### Scenario: Lips off
- **WHEN** the lip height is 0
- **THEN** the shelf is a plain flat slab

#### Scenario: Too high
- **WHEN** the lip would rise above the top of the plate
- **THEN** an error says so and no model is generated

### Requirement: Print orientation
The model SHALL be oriented for printing: the underside of the shelf lies on the ground plane (z = 0) and the plate stands at the shelf's front edge, so no supports are needed and no flipping is required for export.

#### Scenario: On the bed
- **WHEN** the model is shown or exported
- **THEN** the lowest points of the shelf and of the plate's lower edge are at z = 0 and the plate rises from the shelf's front edge

### Requirement: Shelf persistence
The shelf settings SHALL be remembered between visits, and corrupt stored data SHALL fall back to defaults.

#### Scenario: Reload
- **WHEN** the user changes the shelf settings and reloads
- **THEN** the same settings are restored
