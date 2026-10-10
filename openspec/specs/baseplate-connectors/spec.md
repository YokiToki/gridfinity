# baseplate-connectors Specification

## Purpose
Defines how adjacent baseplate parts are joined.

## Requirements

### Requirement: Connector types
Each internal cut SHALL be joinable using one of: none, end-face holes (for screws, magnets or pins), or a printed dovetail/key; the type SHALL be selectable globally and overridable per cut.

#### Scenario: End-face holes
- **WHEN** connector type is end-face holes
- **THEN** matching holes are created on both faces of the cut at the configured positions and depth

#### Scenario: None
- **WHEN** connector type is none
- **THEN** the faces are flat and no extra geometry is added

### Requirement: Matching halves
Connector geometry on one part SHALL line up with its counterpart on the neighbouring part, including the configured clearance for printed keys.

#### Scenario: Dovetail clearance
- **WHEN** a dovetail with 0.2 mm clearance is generated
- **THEN** the socket is 0.2 mm larger per side than the key

### Requirement: Connector settings
The user SHALL configure hole diameter, depth, count per cut face and inset from the faces' top and bottom, with presets (M3 screw, 6×2 magnet, 3 mm pin).

#### Scenario: Count
- **WHEN** count per face is 2 and a cut face is 84 mm long
- **THEN** two connectors are placed symmetrically along the face

### Requirement: Connectors do not break parts
Connector placement SHALL avoid sockets and fastener holes and SHALL keep a minimum wall to the nearest socket; violations SHALL be reported.

#### Scenario: Collision
- **WHEN** a connector would intersect a magnet hole
- **THEN** it is shifted along the face to the nearest free position or reported if none exists
