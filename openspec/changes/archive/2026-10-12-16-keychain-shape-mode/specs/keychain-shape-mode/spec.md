# Spec Delta

## Purpose
Defines the Shape mode of Keychain Master and the split of Keychain Master into an Image mode and a Shape mode.

## ADDED Requirements

### Requirement: Two modes
Keychain Master SHALL have two modes, Image and Shape, each with its own page, parameter panel and saved settings, in the same way as Gridfinity Master has its modes. A chooser page SHALL offer the two modes, the header SHALL switch between them, and everything after the start (relief, base plate, ring mount, two halves, export) SHALL work in both.

#### Scenario: Chooser
- **WHEN** the user opens Keychain Master
- **THEN** a page with the cards Image and Shape is shown and key 1 or 2 opens the mode

#### Scenario: Header switch
- **WHEN** the user selects Shape in the mode switcher while in Image mode
- **THEN** the Shape mode opens and the Image mode settings are kept as they were

#### Scenario: Separate settings
- **WHEN** the user changes the relief height in Shape mode and returns to Image mode
- **THEN** the Image mode relief height is unchanged

#### Scenario: Continue
- **WHEN** the user last worked in Shape mode and opens the start page
- **THEN** the Continue link leads to the Shape mode

### Requirement: Shape mode without a mask
The Shape mode SHALL NOT offer anything that belongs to an image: no image selection, no silhouette threshold, invert, gap closing, speck removal or grow, no areas, no mask preview and no brightness height source.

#### Scenario: Panel content
- **WHEN** the Shape mode is open
- **THEN** its panel has no Image or Silhouette sections and the mask preview is not shown

#### Scenario: Immediate result
- **WHEN** the Shape mode is opened for the first time
- **THEN** a keychain is generated at once with default settings and no image is required

### Requirement: Ready-made shapes
The Shape mode SHALL provide the shapes Rectangle, Circle, Ellipse, Capsule and Polygon, with sizes in millimetres: width and height (the circle takes a diameter, the polygon a width, a number of sides from 3 to 12 and a rotation). Rectangle and Polygon SHALL have a corner radius from a sharp corner up to half of the shorter side, and a few size presets SHALL fill the fields.

#### Scenario: Rectangle
- **WHEN** a rectangle of 54 × 30 mm with corner radius 4 mm is chosen
- **THEN** the model's bounding box is 54 × 30 mm within 0.05 mm and its corners are rounded with radius 4 mm

#### Scenario: Radius limit
- **WHEN** the corner radius is set larger than half of the shorter side
- **THEN** the effective radius is shown as the limit and the shape is a fully rounded rectangle

#### Scenario: Circle
- **WHEN** a circle of 40 mm diameter is chosen
- **THEN** the model's bounding box is 40 × 40 mm

#### Scenario: Polygon
- **WHEN** a polygon with 6 sides and width 30 mm is chosen
- **THEN** the shape is a regular hexagon with that width across its extremes

#### Scenario: Works with the rest
- **WHEN** a shape keychain gets a ring mount or the two-halves mode
- **THEN** they behave as for an image keychain and the placement editor shows the shape outline

### Requirement: Rim
The Shape mode SHALL offer an optional rim, a raised border along the edge of the shape with its own width and height in millimetres. The rim SHALL NOT exist in the Image mode. The inside of the rim is the normal relief level.

#### Scenario: Rim on a plate
- **WHEN** a rim of width 1.2 mm and height 0.8 mm is enabled on a flat rectangle tag
- **THEN** a border 1.2 mm wide stands 0.8 mm above the inner surface along the whole edge

#### Scenario: Rim off
- **WHEN** the rim is switched off
- **THEN** the model equals the one without a rim

#### Scenario: Image mode
- **WHEN** the Image mode is open
- **THEN** no rim control is shown

#### Scenario: Patterns
- **WHEN** a surface pattern is enabled for the whole relief
- **THEN** the pattern may cut into the rim but never below the minimum height
