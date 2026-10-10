# Spec Delta

## Purpose
Defines the Cutout bin: a solid block with fitted negative shapes.

## ADDED Requirements

### Requirement: Cutout bin base
The Cutout mode SHALL produce a bin with the same footprint, height, lip and base rules as Box mode but with a solid interior, and the user SHALL be able to set outer wall thickness.

#### Scenario: Default
- **WHEN** a cutout bin has no cutouts
- **THEN** the result is a solid block with the standard foot and chosen lip

### Requirement: Cutout list
The user SHALL add, duplicate, reorder, rename and delete cutouts; each cutout has its own source, position, rotation, depth, clearance and visibility.

#### Scenario: Add primitive
- **WHEN** the user presses Add and chooses Rectangle
- **THEN** a rectangular cutout appears centred in the bin and in the list

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
