# Spec Delta

## Purpose
Defines how footprints that are not integer multiples of the grid pitch are turned into cells and padding.

## ADDED Requirements

### Requirement: Fractional unit input
Footprint size SHALL be enterable either as decimal units (e.g. 2.5) or as an exact length in millimetres, and the two representations SHALL stay in sync.

#### Scenario: Units to millimetres
- **WHEN** the user enters 2.5 units with a 42 mm pitch
- **THEN** the size field shows 105 mm

#### Scenario: Millimetres to units
- **WHEN** the user enters 100 mm
- **THEN** the units field shows about 2.38

### Requirement: Cells and padding
A footprint SHALL be resolved into a whole number of full grid cells (the floor of size/pitch, at least 1) plus leftover padding along each axis; the padding SHALL be a plain filler without sockets or feet.

#### Scenario: Remainder
- **WHEN** the footprint is 100 mm wide with 42 mm pitch
- **THEN** 2 full cells are placed and 16 mm of padding is added

#### Scenario: Exact multiple
- **WHEN** the footprint is exactly 84 mm
- **THEN** 2 cells are placed and no padding is added

#### Scenario: Smaller than a cell
- **WHEN** the footprint is less than one pitch
- **THEN** one cell is placed and the user is warned that the cell is truncated

### Requirement: Padding alignment
The user SHALL choose how cells are aligned within the footprint (start, center, end) per axis; with center alignment padding is split equally on both sides.

#### Scenario: Centered
- **WHEN** alignment is center and padding is 16 mm
- **THEN** 8 mm of padding is on each side of the cell block

#### Scenario: Start aligned
- **WHEN** alignment is start
- **THEN** all padding is on the far side of the cell block
