# Spec Delta

## Purpose
Defines convenient positioning of cutouts inside the bin.

## ADDED Requirements

### Requirement: Direct manipulation
The user SHALL move and rotate cutouts by dragging in a 2D top view and by entering exact X, Y and angle values.

#### Scenario: Drag
- **WHEN** the user drags a cutout in the top view
- **THEN** its X/Y values update live and the 3D model regenerates on release

#### Scenario: Numeric entry
- **WHEN** the user types X = 20 mm
- **THEN** the cutout's centre moves to 20 mm from the bin centre

### Requirement: Centring and alignment
The app SHALL provide actions to centre a cutout horizontally, vertically or both, align it to a bin edge with a margin, and distribute several cutouts evenly.

#### Scenario: Centre both
- **WHEN** the user presses Centre
- **THEN** the cutout's bounding box centre equals the bin cavity centre

#### Scenario: Align left
- **WHEN** the user aligns left with margin 5 mm
- **THEN** the cutout's left edge is 5 mm from the left inner wall

### Requirement: Snapping
Dragging SHALL snap to the grid pitch fractions, other cutouts' edges and the bin's centre lines, and snapping SHALL be disableable with a modifier key or toggle.

#### Scenario: Snap to centre
- **WHEN** the cutout is dragged near the centre line
- **THEN** it snaps to the centre and a guide line is shown

### Requirement: Fit footprint to contents
The app SHALL offer to resize the bin to the smallest whole or fractional footprint that fits all cutouts with the wall margin.

#### Scenario: Auto-fit
- **WHEN** the user presses Fit footprint with one 120×40 mm cutout
- **THEN** the bin footprint grows to contain it with margins and the cutout stays centred
