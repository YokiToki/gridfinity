# cutout-model Specification

## Purpose
Defines the Cutout bin: a solid block with fitted negative shapes.

## Requirements

### Requirement: Cutout bin base
The Cutout mode SHALL produce a bin with the same footprint, height, lip and base rules as Box mode but with a solid interior, and the user SHALL be able to set outer wall thickness.

#### Scenario: Default
- **WHEN** a cutout bin has no cutouts
- **THEN** the result is a solid block with the standard foot and chosen lip

### Requirement: Cutout list
The user SHALL add, duplicate, reorder, rename and delete cutouts; each cutout has its own source, position, rotation, depth, clearance and visibility. The user SHALL be able to add a rectangle or a circle.

#### Scenario: Add primitive
- **WHEN** the user presses Add and chooses Rectangle
- **THEN** a rectangular cutout appears centred in the bin and in the list

#### Scenario: Add circle
- **WHEN** the user presses Add and chooses Circle
- **THEN** a circular cutout appears centred in the bin and in the list, selected, with a default diameter

#### Scenario: Hide
- **WHEN** a cutout is hidden
- **THEN** it is not subtracted from the model or exported

### Requirement: Depth and clearance
Each cutout SHALL have a depth (up to the available interior height) and a clearance offset that grows the pocket outline on all sides.

#### Scenario: Clearance
- **WHEN** clearance is 0.5 mm
- **THEN** the pocket outline is 0.5 mm larger on every side than the source shape

#### Scenario: Depth limit
- **WHEN** depth exceeds the available height above the floor
- **THEN** depth is limited to leave the minimum floor and a notice is shown

### Requirement: Overlap and bounds feedback
The app SHALL warn when a cutout leaves less than a minimum wall to the outer wall or to another cutout.

#### Scenario: Too close to edge
- **WHEN** a cutout is 0.4 mm from the outer wall
- **THEN** a warning is shown on that cutout

### Requirement: Circular cutout
A circular cutout SHALL be a round pocket defined by its diameter, depth and clearance; the pocket outline is a circle whose diameter is the cutout diameter plus twice the clearance. Position, depth, clearance and visibility behave as for other cutouts, and rotation SHALL not change the pocket.

#### Scenario: Pocket size
- **WHEN** a circle of diameter 20 mm with clearance 0.5 mm is cut 10 mm deep
- **THEN** the pocket is a cylinder 21 mm in diameter and 10 mm deep, centred on the cutout position

#### Scenario: Diameter edit
- **WHEN** the user changes the diameter of the selected circle
- **THEN** the pocket, its outline in the top view and the 3D tool follow the new diameter

#### Scenario: Placement
- **WHEN** the user centres, aligns to an edge, snaps or distributes a circle
- **THEN** the circle (including its clearance) touches or is centred exactly as a rectangle of the same extent would be, whatever its rotation

#### Scenario: Invalid diameter
- **WHEN** the diameter is zero or negative
- **THEN** generation is skipped for that cutout and an error is shown

#### Scenario: Stored data
- **WHEN** a session saved before circles existed is loaded
- **THEN** all its rectangle and part cutouts load unchanged
