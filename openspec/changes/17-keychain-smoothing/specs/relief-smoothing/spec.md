# Spec Delta

## Purpose
Defines smoothing of the relief height, so that photos and stepped surfaces print smoothly.

## ADDED Requirements

### Requirement: Source smoothing
When the height source is image brightness, the user SHALL be able to blur the brightness with a radius in millimetres and optionally remove isolated speckles, before contrast and gamma are applied. The silhouette outline SHALL NOT change.

#### Scenario: Grain removed
- **WHEN** a noisy photo is used as the brightness source and smoothing is 0.4 mm
- **THEN** the height varies smoothly and the single-pixel noise of the picture does not appear in the relief

#### Scenario: Off
- **WHEN** smoothing is 0 mm and speckle removal is off
- **THEN** the relief equals the one produced without smoothing

#### Scenario: Silhouette unchanged
- **WHEN** smoothing is changed
- **THEN** the outline of the keychain is the same

### Requirement: Surface smoothing
For every height source the user SHALL be able to smooth the finished relief surface with a radius from 0 to 3 mm, 0 meaning off. Smoothing SHALL be applied before detail lines, surface patterns, text and area levels, so those stay crisp, and SHALL NOT lower the surface below the minimum rim height or change the base plate thickness.

#### Scenario: Terraces softened
- **WHEN** the profile is Terraced and the surface smoothing is 0.5 mm
- **THEN** the steps between the levels become gradual slopes about 0.5 mm wide

#### Scenario: Pattern stays crisp
- **WHEN** a surface pattern and surface smoothing are both on
- **THEN** the pattern edges are as sharp as without smoothing

#### Scenario: No bleeding
- **WHEN** smoothing is on near the silhouette border
- **THEN** no height leaks from outside the silhouette and the rim height is at least the minimum

### Requirement: Smoothing and resolution
When the smoothing radius is smaller than one grid cell the app SHALL tell the user that it has no effect at the current resolution and offer to raise the resolution within the triangle budget.

#### Scenario: No effect warning
- **WHEN** the radius is 0.1 mm and the grid step is 0.25 mm
- **THEN** a warning shows the grid step and a button that raises the resolution

### Requirement: Compatibility
Keychains saved before this feature SHALL load with smoothing off and produce the same model as before.

#### Scenario: Old record
- **WHEN** a keychain saved with the brightness source is loaded
- **THEN** its smoothing is 0 and the model is unchanged
