# unit-display Specification

## Purpose
Defines how lengths are shown and entered in millimetres or inches while geometry stays in millimetres.

## Requirements

### Requirement: Global length unit
The app SHALL provide a global setting to display and enter lengths in millimetres or inches, persisted across reloads.

#### Scenario: Switch to inches
- **WHEN** the user switches the unit to inch
- **THEN** every length field and the model measurements show inches and the label of each field shows "in"

#### Scenario: Entering inches
- **WHEN** the unit is inch and the user enters 2 in a length field
- **THEN** the model uses 50.8 mm for that parameter

### Requirement: Lossless unit switching
Switching the display unit SHALL NOT change the underlying model dimensions or the generated geometry.

#### Scenario: Round trip
- **WHEN** the user switches mm → inch → mm without editing
- **THEN** all parameter values and the exported model are identical to before

### Requirement: Model measurements readout
The app SHALL show the model's X, Y and Z bounding dimensions in the selected unit.

#### Scenario: Readout updates
- **WHEN** the model is regenerated
- **THEN** the measurements reflect the new bounding box in the selected unit
