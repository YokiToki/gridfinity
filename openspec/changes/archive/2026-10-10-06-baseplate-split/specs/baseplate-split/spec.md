# Spec Delta

## Purpose
Defines how an oversized baseplate is divided into printable parts.

## ADDED Requirements

### Requirement: Automatic split
When splitting is enabled the generator SHALL divide the plate along cell boundaries into the fewest parts whose every dimension fits within the build volume, distributing cells as evenly as possible.

#### Scenario: Fits already
- **WHEN** the plate fits the build volume
- **THEN** a single part is produced and no connectors are added

#### Scenario: Two parts
- **WHEN** a 7×4 cell plate (294 mm) is split for a 256 mm bed
- **THEN** two parts of 4 and 3 cells (or 3 and 4) are produced, each ≤ 256 mm

#### Scenario: Single cell too big
- **WHEN** one cell is larger than the build volume
- **THEN** splitting is refused with a localized error

### Requirement: Manual cut positions
The user SHALL be able to override automatic cuts by choosing the cut lines between cell columns/rows; cuts that make a part exceed the build volume SHALL be flagged.

#### Scenario: Move a cut
- **WHEN** the user moves a cut one cell to the right
- **THEN** the neighbouring parts resize and the part list updates

#### Scenario: Part too large
- **WHEN** a manual cut leaves a part larger than the bed
- **THEN** that part is highlighted and export is warned but not blocked

### Requirement: Padding handling
Padding strips SHALL stay attached to the outermost parts so that the assembled outline equals the requested footprint.

#### Scenario: Assembled size
- **WHEN** the parts are assembled
- **THEN** their union has the same outline as the unsplit plate

### Requirement: Part preview and labels
The preview SHALL show parts assembled or separated by a configurable gap, each with a stable label (A1, A2, B1 …) that is also embedded in the exported part name.

#### Scenario: Exploded
- **WHEN** the user enables separated view
- **THEN** parts move apart by the gap without changing their geometry

### Requirement: Build volume source
The build volume SHALL come from the preview build plate size or a printer preset, whichever the user selected last, and SHALL be editable.

#### Scenario: Preset selected
- **WHEN** a printer preset is selected
- **THEN** the split uses that preset's bed size minus the user's safety margin
