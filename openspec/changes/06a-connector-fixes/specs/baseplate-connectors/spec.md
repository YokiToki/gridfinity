# Spec Delta

## Purpose
Defines how adjacent baseplate parts are joined.

## MODIFIED Requirements

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
The user SHALL configure hole diameter, depth, count per cut face and inset from the ends of the cut face, with presets (1.75 mm filament, 2 mm pin, 3 mm pin, M3 screw, 6×2 magnet); the default preset SHALL be the 1.75 mm filament rod with a 1.9 mm hole. Dovetail settings are neck and tip width, key depth, key height and fit clearance.

#### Scenario: Count
- **WHEN** count per face is 2 and a cut face is 84 mm long
- **THEN** two connectors are placed symmetrically along the face

#### Scenario: Filament preset
- **WHEN** the user picks the 1.75 mm filament preset
- **THEN** the hole diameter is 1.9 mm

#### Scenario: Effective depth
- **WHEN** the configured depth is more than the wall allows
- **THEN** the hole is made only as deep as the wall allows and the effective depth is shown next to the setting

### Requirement: Connectors do not break parts
Connector placement SHALL avoid sockets and fastener holes and SHALL keep a minimum wall to the nearest socket; violations SHALL be reported. End-face holes SHALL be blind: they SHALL NOT reach a socket, so no hole goes through the wall between sockets.

#### Scenario: Collision
- **WHEN** a connector would intersect a magnet hole
- **THEN** it is shifted along the face to the nearest free position or reported if none exists

#### Scenario: Blind hole
- **WHEN** a hole is generated at the default filament preset
- **THEN** it stays at least 0.4 mm away from the sockets on both sides and ends inside the part

#### Scenario: Hole too large
- **WHEN** a preset such as the 6×2 magnet does not fit in the wall between sockets
- **THEN** no connector is generated and the user is told why
