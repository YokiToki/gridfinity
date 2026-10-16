# Spec Delta

## ADDED Requirements

### Requirement: Traced outline cutout
A cutout SHALL be able to have a traced outline as its source: a closed polygon in millimetres with no holes. Its pocket outline is the polygon grown by the clearance, cut to the cutout depth, and position, rotation, depth, clearance, visibility and colour behave as for other cutouts. Its size SHALL be shown in the cutout properties and its outline in the top view and in the 3D tool overlay.

#### Scenario: Pocket follows the outline
- **WHEN** a traced outline of a 40 × 20 mm shape has clearance 0.5 mm and depth 10 mm
- **THEN** the pocket is that shape grown by 0.5 mm on all sides, 10 mm deep

#### Scenario: Placement
- **WHEN** the user rotates, centres, aligns or snaps a traced outline
- **THEN** it behaves as any other cutout, using the exact bounds of its rotated outline plus the clearance

#### Scenario: Invalid outline
- **WHEN** a stored outline has fewer than three points or zero area
- **THEN** that cutout is dropped on load

#### Scenario: Stored data
- **WHEN** a session with rectangle, circle, part and traced cutouts is saved and loaded
- **THEN** all of them are restored unchanged
