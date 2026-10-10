# baseplate-connectors Specification

## Purpose
Defines how adjacent baseplate parts are joined.

## Requirements

### Requirement: Connector types
Each internal cut SHALL be joinable using one of: none, end-face holes (for magnets or pins) drilled into the ends of the ribs that meet the cut, or a printed dovetail/key; the type SHALL be selectable globally and overridable per cut.

#### Scenario: End-face holes
- **WHEN** connector type is end-face holes
- **THEN** matching holes are created in the rib ends on both sides of the cut, on the same axes, at the configured depth

#### Scenario: None
- **WHEN** connector type is none
- **THEN** the faces are flat and no extra geometry is added

### Requirement: Matching halves
Connector geometry on one part SHALL line up with its counterpart on the neighbouring part, including the configured clearance for printed keys. A dovetail key SHALL lie flat on the build plate: it starts at the underside of its part, and the matching socket is open at the underside and closed at the top, so the parts join by lowering one onto the other.

#### Scenario: Dovetail clearance
- **WHEN** a dovetail with 0.2 mm clearance is generated
- **THEN** the socket is 0.2 mm larger per side than the key

#### Scenario: Key on the bed
- **WHEN** a part with a dovetail key is generated
- **THEN** the key's lowest point is at the underside of the part (z = 0) and its height is the configured key height, 2 mm by default

#### Scenario: Open socket
- **WHEN** the neighbouring part's socket is generated
- **THEN** the socket reaches the underside of that part and ends 0.2 mm (the clearance) above the key's top

### Requirement: Connector settings
The user SHALL configure hole diameter, depth, count per cut face and inset from the ends of the cut face, with presets (1.75 mm filament, 2 mm pin, 3 mm pin, 3×2 mm magnet, 2.8×0.75 mm magnet); the default preset SHALL be the 1.75 mm filament rod with a 1.9 mm hole. Dovetail settings are neck and tip width, key depth, key height and fit clearance.

#### Scenario: Count
- **WHEN** count per face is 2 and the cut face has three rib ends
- **THEN** two of them are used, the two closest to the evenly spaced positions between the insets, and the same rib ends are used in both parts

#### Scenario: Magnet preset
- **WHEN** the user picks the 3×2 mm magnet preset
- **THEN** the hole diameter is 3.1 mm and its depth is 2.1 mm in each part, so a disc magnet sits in each part facing the other

#### Scenario: Thin magnet preset
- **WHEN** the user picks the 2.8×0.75 mm magnet preset
- **THEN** the hole diameter is 2.95 mm and its depth is 0.85 mm in each part

#### Scenario: Filament preset
- **WHEN** the user picks the 1.75 mm filament preset
- **THEN** the hole diameter is 1.9 mm

#### Scenario: Depth
- **WHEN** the configured depth is 6 mm
- **THEN** each part gets a hole 6 mm deep along the rib, and the effective depth is shown next to the setting

#### Scenario: Depth limited by the part
- **WHEN** the configured depth is more than the part's length along the hole allows
- **THEN** the hole is made only as deep as the part allows (leaving 2 mm of material) and the effective depth is shown

### Requirement: Connectors do not break parts
Connector placement SHALL avoid sockets and fastener holes and SHALL keep a minimum wall to the nearest socket; violations SHALL be reported. End-face holes SHALL be drilled into the end of a rib that meets the cut, along the rib, and SHALL be blind: they SHALL NOT reach a socket, so no hole goes through the wall between sockets.

#### Scenario: Collision
- **WHEN** a connector would intersect a magnet hole
- **THEN** it is moved to another rib end on the face or reported if none is free

#### Scenario: Blind hole
- **WHEN** a hole is generated at the default filament preset
- **THEN** it stays at least 0.4 mm away from the sockets on both sides along its whole length and ends inside the part

#### Scenario: Hole too large
- **WHEN** a custom hole is wider than the rib allows (for example 6 mm)
- **THEN** no connector is generated and the user is told why

#### Scenario: Face without a rib end
- **WHEN** a cut face is one cell wide and has no rib ending on it
- **THEN** no end-face hole is generated and the user is told why
