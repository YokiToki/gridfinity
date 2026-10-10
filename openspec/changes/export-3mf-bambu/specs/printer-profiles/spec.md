# Spec Delta

## Purpose
Defines printer presets and the Bambu Studio metadata that accompanies a 3MF export.

## ADDED Requirements

### Requirement: Printer presets
The app SHALL provide a list of printer presets with bed dimensions and maximum height, and a custom option; the selected preset SHALL set the preview build plate and the build volume used by baseplate splitting.

#### Scenario: Choose preset
- **WHEN** the user selects a preset with a 256×256 mm bed
- **THEN** the build plate in the preview becomes 256×256 mm and splitting uses it

#### Scenario: Custom
- **WHEN** the user selects Custom and enters 220×220 mm
- **THEN** that size is used and persisted

### Requirement: Printable-area margin
The user SHALL set a margin subtracted from the bed on every side for split and arrangement calculations.

#### Scenario: Margin
- **WHEN** the margin is 5 mm on a 256 mm bed
- **THEN** the usable size for splitting is 246 mm

### Requirement: Bambu Studio metadata
When a Bambu printer is selected, the 3MF export SHALL include project metadata for the printer model, nozzle diameter, a process preset and a filament preset, which the user can change in the export dialog; non-Bambu or Custom printers SHALL export a plain 3MF.

#### Scenario: Bambu project
- **WHEN** an A1 preset with 0.4 mm nozzle and 0.20 mm Standard process is exported
- **THEN** the package carries those selections as project metadata

#### Scenario: Plain 3MF
- **WHEN** the printer is Custom
- **THEN** no Bambu-specific metadata is included

### Requirement: Maintainable preset data
Printer presets SHALL live in a single data file with source references and be covered by a validation test (positive sizes, unique ids).

#### Scenario: Validation
- **WHEN** tests run
- **THEN** every preset has a unique id, positive bed dimensions and a display name for both languages
