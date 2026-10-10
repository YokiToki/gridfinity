# Spec Delta

## Purpose
Defines how the 3D preview is navigated and what is drawn around the model.

## ADDED Requirements

### Requirement: Orbit through the ground plane
The user SHALL be able to orbit the camera through the XY plane and view the model from below and from any direction, while the view keeps Z up.

#### Scenario: View from below
- **WHEN** the user drags the view so that the camera goes below the XY plane
- **THEN** the camera continues under the model and shows its underside

#### Scenario: Bottom view from the gizmo
- **WHEN** the user selects the negative Z end of the axis gizmo
- **THEN** the camera looks straight at the underside of the model

#### Scenario: No flipping
- **WHEN** the camera passes directly above or below the model
- **THEN** the view does not roll or flip upside down

### Requirement: Ground grid below the model
The ground grid and the build plate overlay SHALL be hidden while the camera is below the XY plane, and shown again when it comes back above; the change SHALL be smooth, not a sudden jump.

#### Scenario: Camera goes below
- **WHEN** the camera crosses below the XY plane
- **THEN** the grid and the build plate overlay fade out so the underside is not covered

#### Scenario: Camera comes back
- **WHEN** the camera returns above the XY plane
- **THEN** the grid and the build plate overlay are shown again

#### Scenario: Looking along the plane
- **WHEN** the camera is exactly in the XY plane
- **THEN** the grid is hidden or almost invisible, never drawn through the model

### Requirement: Underside lighting
Faces that point down SHALL be lit well enough to read their shape, so holes and pockets on the underside are visible.

#### Scenario: Magnet pockets
- **WHEN** a bin with magnet pockets is viewed from below
- **THEN** the pockets are visible as shaded recesses, not as a black underside
