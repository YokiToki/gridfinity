# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
