# keychain-split Specification

## Purpose
Defines the two-halves mode, alignment pins and the print sheet.

## Requirements

### Requirement: Two-halves mode
When two-halves mode is on, the relief SHALL be symmetric about the mid plane and split into a top half and a bottom half, each printable face-down with a flat back and no supports. Heights and total thickness SHALL equal those of the single-sided model's relief mirrored, and the parts SHALL fit together without a gap.

#### Scenario: Split
- **WHEN** two-halves mode is turned on for a valid keychain
- **THEN** two solids are produced and their combined volume equals the volume of the unsplit symmetric model within 0.5 %

#### Scenario: Flat backs
- **WHEN** the halves are laid out for printing
- **THEN** each half has its cut face on the build plane at z = 0

#### Scenario: Single-sided
- **WHEN** two-halves mode is off
- **THEN** the single-sided model of `keychain-relief` is produced unchanged

### Requirement: Alignment pins
The user SHALL set the number of pins (0–6), pin radius, clearance and hole depth. Pin holes SHALL be cut into both halves at matching positions and loose pins SHALL be added to the print sheet with a radius smaller than the hole by the clearance and a length not greater than the combined hole depth. Positions SHALL be auto-placed on robust anchors and movable in the placement editor.

#### Scenario: Auto pins
- **WHEN** the user sets 3 pins
- **THEN** three pin holes are placed at positions with at least the minimum wall around each, in both halves

#### Scenario: Pin fit
- **WHEN** radius is 0.9 mm and clearance 0.1 mm
- **THEN** the loose pin radius is 0.8 mm

#### Scenario: Pin too big
- **WHEN** a hole footprint would break the surface of either half
- **THEN** that position is rejected with a warning and not used

### Requirement: Print sheet and export
The app SHALL arrange both halves and the loose pins side by side on one sheet without overlap, show it in the viewport, and export it as one STL, or export each half separately. The export block SHALL show the overall sheet size.

#### Scenario: One file
- **WHEN** the user exports the print sheet
- **THEN** one STL contains both halves and all loose pins, in millimetres, with no overlapping parts

#### Scenario: Separate halves
- **WHEN** the user exports the top half only
- **THEN** the STL contains that half alone

#### Scenario: Mirror safety
- **WHEN** the bottom half is placed on the sheet
- **THEN** it is rotated 180° about a horizontal axis, never mirrored, so its front side is still the visible side after gluing
