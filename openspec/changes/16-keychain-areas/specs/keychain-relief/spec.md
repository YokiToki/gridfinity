# Spec Delta

## ADDED Requirements

### Requirement: Area levels
An area in Level mode SHALL be solid with a flat top at the plate thickness plus the chosen level, in millimetres, and at least the minimum rim height. Any number of areas MAY have levels and each has its own. A levelled area has a sharp step at its border; relief profile, detail lines and surface patterns SHALL NOT be applied inside it.

#### Scenario: Two levels
- **WHEN** area 2 has level 0.6 mm and area 5 has level 1.4 mm
- **THEN** the top of area 2 is 0.6 mm and the top of area 5 is 1.4 mm above the plate, each flat

#### Scenario: Minimum
- **WHEN** a level below the minimum rim height is entered
- **THEN** the area is built at the minimum rim height and the field shows the effective value

#### Scenario: Patterns
- **WHEN** a surface pattern is enabled for the whole relief
- **THEN** the levelled areas stay smooth and the rest of the relief carries the pattern

#### Scenario: Plain keychains unchanged
- **WHEN** no area is in Level mode
- **THEN** the model equals the one produced before this change for the same parameters
