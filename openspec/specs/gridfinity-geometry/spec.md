# gridfinity-geometry Specification

## Purpose
Defines the shared geometric contract (profiles, thickness settings, generation lifecycle) used by every generator mode.

## Requirements

### Requirement: Standard Gridfinity dimensions
The generator SHALL use the 42 mm grid pitch by default, 7 mm height unit, and the standard foot/socket profile (0.8 / 1.8 / 2.15 mm layers), allowing the grid pitch to be changed by the user.

#### Scenario: Default pitch
- **WHEN** a model is generated with default settings
- **THEN** cells are spaced 42 mm apart and the base profile follows the standard layer heights

#### Scenario: Custom pitch
- **WHEN** the user sets the grid pitch to 40 mm
- **THEN** cell spacing and profile footprints scale to 40 mm while layer heights stay unchanged

### Requirement: Thickness settings
Each mode SHALL expose thickness settings for the walls, floor and clearance relevant to it, with spec defaults and a reset-to-default action; invalid combinations SHALL be rejected with a localized message instead of producing broken geometry.

#### Scenario: Reset
- **WHEN** the user presses reset on the thickness section
- **THEN** all thickness values return to their spec defaults

#### Scenario: Impossible wall
- **WHEN** wall thicknesses leave no interior space
- **THEN** the offending field shows an error and the previous valid model stays displayed

### Requirement: Off-thread generation
Model generation SHALL NOT block user interaction; rapid parameter changes SHALL be coalesced and a superseded generation SHALL NOT replace a newer result.

#### Scenario: Dragging a value
- **WHEN** the user changes parameters several times within the debounce window
- **THEN** only the latest parameters are generated and displayed, and the UI stays responsive

#### Scenario: Progress indication
- **WHEN** a generation takes longer than a short threshold
- **THEN** a "generating" indicator is shown until it completes

### Requirement: Valid solids
Every generated model SHALL be a valid closed manifold solid.

#### Scenario: Validity
- **WHEN** any supported parameter combination is generated
- **THEN** the result has no manifold error status and a positive volume
