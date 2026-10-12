# Spec Delta

## Purpose
Defines the second starting point of Keychain Master: ready-made shapes, and the rim.

## ADDED Requirements

### Requirement: Starting point
Keychain Master SHALL offer two equal starting points, an image and a ready-made shape, in the empty state and at the top of the panel. Switching between them SHALL keep the settings of each, and everything after the start (relief, base plate, mounts, two halves, export) SHALL work the same for both.

#### Scenario: Empty state
- **WHEN** a user opens Keychain Master for the first time
- **THEN** two choices, Image and Shape, are shown

#### Scenario: Shape without an image
- **WHEN** the user chooses Shape
- **THEN** a keychain is generated at once with default settings and no image is required

#### Scenario: Switching
- **WHEN** the user switches from Shape to Image and back
- **THEN** the shape settings are as they were left

### Requirement: Ready-made shapes
The app SHALL provide the shapes Rectangle, Circle, Ellipse, Capsule and Polygon, with sizes in millimetres: width and height (the circle takes a diameter, the polygon a width and a number of sides from 3 to 12). Rectangle and Polygon SHALL have a corner radius, from a sharp corner up to half of the shorter side, and a few starting size presets SHALL fill the fields.

#### Scenario: Rectangle
- **WHEN** a rectangle of 54 × 30 mm with corner radius 4 mm is chosen
- **THEN** the model's bounding box is 54 × 30 mm within 0.05 mm and its corners are rounded with radius 4 mm

#### Scenario: Radius limit
- **WHEN** the corner radius is set larger than half of the shorter side
- **THEN** the effective radius is shown as the limit and the shape is a capsule-like rounded rectangle

#### Scenario: Circle
- **WHEN** a circle of 40 mm diameter is chosen
- **THEN** the model's bounding box is 40 × 40 mm

#### Scenario: Polygon
- **WHEN** a polygon with 6 sides and width 30 mm is chosen
- **THEN** the shape is a regular hexagon with that width across its extremes

#### Scenario: Works with the rest
- **WHEN** a shape keychain gets a ring mount or the two-halves mode
- **THEN** they behave as for an image keychain

### Requirement: Rim
The app SHALL offer an optional rim, a raised border along the edge of a ready-made shape with its own width and height in millimetres. The rim SHALL NOT be offered for image silhouettes. The inside of the rim is the normal relief level.

#### Scenario: Rim on a plate
- **WHEN** a rim of width 1.2 mm and height 0.8 mm is enabled on a flat rectangle tag
- **THEN** a border 1.2 mm wide stands 0.8 mm above the inner surface along the whole edge

#### Scenario: Image keychain
- **WHEN** the starting point is an image
- **THEN** no rim control is shown

#### Scenario: Rim off
- **WHEN** the rim is switched off
- **THEN** the model equals the one without a rim

#### Scenario: Patterns
- **WHEN** a surface pattern is enabled for the whole relief
- **THEN** the pattern may cut into the rim but never below the minimum height
