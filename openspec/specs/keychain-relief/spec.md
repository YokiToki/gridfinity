# keychain-relief Specification

## Purpose
Defines the 3D relief generated from the silhouette, its physical size and its base plate.

## Requirements

### Requirement: Relief profile
The relief SHALL be a heightfield over the silhouette: height rises from the silhouette rim along a bevel of configurable width and exponent to a plateau of configurable maximum height. The rim SHALL never be thinner than the configured minimum height.

#### Scenario: Plateau height
- **WHEN** max height is 2 mm and base thickness is 0
- **THEN** the highest point of the model is 2 mm above the build plane

#### Scenario: Bevel
- **WHEN** edge width grows
- **THEN** the slope from rim to plateau is longer and the plateau area is smaller

#### Scenario: Narrow features
- **WHEN** a silhouette feature is thinner than twice the edge width
- **THEN** its top is lower than the plateau but its height stays at least the minimum height

### Requirement: Physical size
The keychain SHALL be scaled to the size the user sets in millimetres: the longest side, or width and height with the aspect ratio locked by default. Changing the size SHALL scale the silhouette only; heights and thicknesses stay in millimetres.

#### Scenario: Longest side
- **WHEN** the longest side is 70 mm
- **THEN** the model bounding box has its longest horizontal side 70 mm within 0.1 mm

#### Scenario: Heights unchanged by scaling
- **WHEN** the size changes from 70 to 40 mm
- **THEN** the plateau height and base thickness are unchanged

#### Scenario: Units
- **WHEN** the display unit is inches
- **THEN** all keychain lengths are shown in inches and stored in millimetres

### Requirement: Base plate
The model SHALL have a base plate of configurable thickness under the relief. Its outline SHALL be one of: follow the silhouette with an offset, rectangle, rounded rectangle, or circle, with an explicit size and a margin. The relief SHALL stay inside the plate outline; if the chosen shape is smaller than the silhouette the user SHALL see a localized validation error and no geometry is regenerated.

#### Scenario: Follow silhouette
- **WHEN** the plate follows the silhouette with offset 2 mm
- **THEN** the plate outline is the silhouette grown by 2 mm and the model is one solid

#### Scenario: Rounded rectangle
- **WHEN** the plate is a rounded rectangle with margin 3 mm and radius 4 mm
- **THEN** its size is the silhouette bounding box plus 3 mm on each side and its corners have radius 4 mm

#### Scenario: Plate too small
- **WHEN** the plate is a circle with a diameter smaller than the silhouette's diagonal extent
- **THEN** a validation error is shown and export is disabled

#### Scenario: No plate
- **WHEN** base thickness is 0
- **THEN** only the relief is generated and the rim follows the minimum height

### Requirement: Printable solid
The generated model SHALL be a single watertight solid with a flat back on the build plane, and the viewport SHALL show its overall size and volume. STL export SHALL use millimetres.

#### Scenario: Valid solid
- **WHEN** any valid combination of settings is generated
- **THEN** the mesh is a manifold with positive volume and the bottom face lies at z = 0

#### Scenario: Responsive editing
- **WHEN** the user drags a slider
- **THEN** the previous mesh stays visible until the new one is ready and a busy indicator is shown after 200 ms

### Requirement: Resolution and budget
The user SHALL be able to trade quality for speed with a resolution setting; the generated mesh SHALL stay under a triangle budget and the app SHALL tell the user when resolution was reduced to fit it.

#### Scenario: Budget
- **WHEN** the requested resolution would exceed the triangle budget
- **THEN** the effective resolution is reduced and a notice shows the effective value

### Requirement: Area levels
An area in Level mode SHALL be solid with a flat top at the plate thickness plus the chosen level, in millimetres, and at least the minimum rim height. Any number of areas MAY have levels and each has its own. A levelled area has a sharp step at its border; relief profile, detail lines, smoothing and surface patterns SHALL NOT be applied inside it.

#### Scenario: Two levels
- **WHEN** area 2 has level 0.6 mm and area 5 has level 1.4 mm
- **THEN** the top of area 2 is 0.6 mm and the top of area 5 is 1.4 mm above the plate, each flat

#### Scenario: Minimum
- **WHEN** a level below the minimum rim height is entered
- **THEN** the area is built at the minimum rim height and the field shows the effective value

#### Scenario: Patterns
- **WHEN** a surface pattern is enabled for the whole relief
- **THEN** the levelled areas stay smooth and the rest of the relief carries the pattern

#### Scenario: Plain keychains unchanged
- **WHEN** no area is in Level mode
- **THEN** the model equals the one produced before this change for the same parameters
