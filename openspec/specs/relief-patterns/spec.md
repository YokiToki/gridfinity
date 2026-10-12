# relief-patterns Specification

## Purpose
Defines how the relief height can be derived and decorated beyond the plain bevelled plateau.

## Requirements

### Requirement: Height source
The user SHALL choose what drives the relief height: the distance from the silhouette rim (default) or the brightness of the source image inside the silhouette. The brightness source SHALL offer contrast, gamma and invert controls and SHALL work for continuous-tone images.

#### Scenario: Default unchanged
- **WHEN** the height source is Silhouette distance and no pattern is enabled
- **THEN** the model is identical to the one produced by `keychain-relief` for the same parameters

#### Scenario: Brightness source
- **WHEN** the height source is Image brightness and the image has a bright and a dark area inside the silhouette
- **THEN** the bright area is higher than the dark area by the configured height range

#### Scenario: Invert brightness
- **WHEN** the user turns Invert on
- **THEN** the bright area becomes the lower one

### Requirement: Profile presets
The app SHALL offer profile presets Bevel, Dome, Terraced, Flat and Engraved. A preset sets the profile parameters; every parameter SHALL stay editable afterwards and the panel SHALL then show the preset as Custom.

#### Scenario: Terraced
- **WHEN** Terraced is chosen with 3 steps
- **THEN** the relief top consists of 3 flat levels between the rim height and the maximum height

#### Scenario: Dome
- **WHEN** Dome is chosen
- **THEN** the height rises smoothly with zero slope at the plateau

#### Scenario: Engraved
- **WHEN** Engraved is chosen
- **THEN** the silhouette interior is lowered into the base plate by the configured depth and the plate rim stays at full thickness

#### Scenario: Custom
- **WHEN** the user edits any profile value after choosing a preset
- **THEN** the preset indicator changes to Custom and the values are kept

### Requirement: Detail lines
The user SHALL be able to add a spine ridge along the medial axis of the silhouette and an engraved groove along the edge band, with strength and width controls in millimetres.

#### Scenario: Spine
- **WHEN** spine amplitude is greater than 0
- **THEN** a narrow ridge follows the centre line of each part of the silhouette and rises above the plateau by at most the amplitude

#### Scenario: Groove
- **WHEN** groove strength is greater than 0
- **THEN** a groove is cut near the rim and its depth does not reduce the height below the minimum height

### Requirement: Surface patterns
The user SHALL be able to apply one surface pattern from Lines, Crosshatch, Dots, Hex and Ripples. Each pattern has a size/pitch, line or dot width, depth, angle where meaningful, and an offset, all in millimetres or degrees. Patterns SHALL be crisp (sharp edges, flat bottoms) and SHALL be limited to the chosen scope: whole relief, plateau only, or base plate only.

#### Scenario: Lines
- **WHEN** Lines is enabled with pitch 1.2 mm, width 0.4 mm and depth 0.3 mm
- **THEN** parallel grooves 0.4 mm wide repeat every 1.2 mm across the scope, each 0.3 mm deep

#### Scenario: Angle
- **WHEN** the angle of Lines changes from 0° to 45°
- **THEN** the grooves rotate by 45° about the keychain centre

#### Scenario: Depth clamp
- **WHEN** the pattern depth exceeds the available height at some point
- **THEN** the height at that point is reduced only down to the minimum height, never below, and the model stays a valid solid

#### Scenario: Scope
- **WHEN** the scope is Plateau only
- **THEN** the bevel and the base plate carry no pattern

#### Scenario: No pattern
- **WHEN** the pattern is None
- **THEN** the surface has no pattern and no extra geometry is generated

### Requirement: Resolution awareness
When a pattern feature is smaller than the effective mesh cell, the app SHALL tell the user which setting limits it and SHALL offer to raise resolution within the triangle budget.

#### Scenario: Too fine
- **WHEN** the pattern pitch is smaller than four effective cells
- **THEN** a warning shows the effective cell size and the minimum recommended pitch
