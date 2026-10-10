# Spec Delta

## Purpose
Defines how a keychain gets a ring attachment and how the user positions it.

## ADDED Requirements

### Requirement: Ring mount styles
The keychain SHALL support these mounts: none, through hole, eyelet lug, and embedded channel (available only in two-halves mode). Hole and channel diameters, eyelet outer size and wall are set in millimetres, with presets for common ring wire sizes.

#### Scenario: Through hole
- **WHEN** a through hole of 4 mm diameter is placed inside the plate
- **THEN** the model has a vertical hole of 4 mm through the full thickness at that position

#### Scenario: Eyelet lug
- **WHEN** an eyelet is placed at the plate edge
- **THEN** a lug with the configured outer diameter and hole diameter is added, merged into the plate, and the model stays one solid

#### Scenario: Channel needs split
- **WHEN** two-halves mode is off
- **THEN** the embedded channel option is disabled with an explanation

### Requirement: Placement editor
The user SHALL position the mount on a top-view editor that shows the silhouette, a millimetre grid with rulers, and the mount footprint to scale. The mount SHALL be movable by dragging and by typing exact X and Y, and SHALL snap to the nearest outline point on request.

#### Scenario: Drag
- **WHEN** the user drags the mount to a new spot
- **THEN** X and Y fields update and the model regenerates with the mount there

#### Scenario: Exact entry
- **WHEN** the user types X = 23.6 and Y = 28 mm
- **THEN** the mount footprint is centred at that point of the editor grid and in the model

#### Scenario: Survives resizing
- **WHEN** the keychain size changes
- **THEN** the mount keeps its relative position on the silhouette

#### Scenario: Units
- **WHEN** the display unit is inches
- **THEN** the grid, rulers and fields use inches while positions are stored in millimetres

### Requirement: Suggested anchors
The app SHALL offer Suggest, which proposes mount positions where the surrounding wall is at least the configured minimum, measured as the minimum height over the whole footprint and not at the centre point, and which lists rejected candidates with a reason.

#### Scenario: Suggest
- **WHEN** the user presses Suggest on a silhouette with a clear edge area
- **THEN** one or more candidate positions are shown on the editor and choosing one places the mount there

#### Scenario: No safe spot
- **WHEN** no candidate satisfies the margins
- **THEN** a localized message explains why and suggests the eyelet style

### Requirement: Fit checks
After generation the app SHALL verify the mount: remaining wall around a hole or channel is at least the minimum, an embedded channel breaches to open air at its exterior end, and every feature lies inside the plate. Failures SHALL be shown as warnings with the feature name and distance.

#### Scenario: Thin wall
- **WHEN** a through hole is closer to the edge than the minimum wall
- **THEN** a warning names the hole and shows the actual wall in the current unit

#### Scenario: Channel breach
- **WHEN** a channel exit is placed inside the solid and does not reach the exterior
- **THEN** a warning says the channel does not open to the outside and export of that sheet is flagged
