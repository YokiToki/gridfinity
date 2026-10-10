# cutout-import Specification

## Purpose
Defines supported cutout sources: imported STL meshes and built-in primitives.

## Requirements

### Requirement: STL import
The user SHALL import binary or ASCII STL files by file picker or drag-and-drop; files are processed locally and never uploaded.

#### Scenario: Valid file
- **WHEN** the user drops a valid STL
- **THEN** it appears as a cutout with its detected size shown in the selected unit

#### Scenario: Invalid file
- **WHEN** the file is not a readable STL or has no volume
- **THEN** a localized error is shown and no cutout is added

### Requirement: Import units and orientation
The user SHALL choose the import unit (mm or inch) and orient the part by selecting which face lies flat or by rotating in 90° steps.

#### Scenario: Inch file
- **WHEN** the import unit is inch
- **THEN** the shape is scaled by 25.4 before use

#### Scenario: Lay flat
- **WHEN** the user picks a face as "bottom"
- **THEN** the part rotates so that face is the pocket floor

### Requirement: Cutting mode
For imported shapes the user SHALL choose between a projected pocket (footprint extruded to depth) and a true 3D subtraction of the shape.

#### Scenario: Projected
- **WHEN** projected mode is selected
- **THEN** the pocket has vertical walls following the shape's outline

#### Scenario: True 3D
- **WHEN** 3D mode is selected
- **THEN** the pocket follows the shape's volume

### Requirement: Primitives
The app SHALL provide a rectangle primitive with width, length, corner radius and depth, usable without importing a file.

#### Scenario: Rounded rectangle
- **WHEN** width 60, length 20 and radius 4 are set
- **THEN** the pocket is a 60×20 mm rounded rectangle

### Requirement: Mesh robustness
Non-manifold imported meshes SHALL be repaired where possible (merging duplicate vertices, fixing orientation); if still invalid the user SHALL be told and the shape's projected outline SHALL remain usable.

#### Scenario: Open mesh
- **WHEN** an STL has duplicate vertices but is otherwise closed
- **THEN** it is accepted after welding
