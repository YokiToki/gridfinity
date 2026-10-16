# keychain-assembled-view Specification

## Purpose
Defines how the two halves of a keychain are shown put together.

## Requirements

### Requirement: Assembled view
When two-halves mode is on the viewport SHALL offer a choice between the print sheet and an assembled view. In the assembled view the bottom half SHALL lie against the top half at the mating plane as it will be glued, with the loose pins inserted in their holes. Switching SHALL not regenerate the model or change what is exported.

#### Scenario: Switch
- **WHEN** the user selects Assembled
- **THEN** the halves are shown joined into the finished keychain, the part labels and build plate overlay are hidden

#### Scenario: Pins
- **WHEN** the view is Assembled
- **THEN** each loose pin sits in its hole across the mating plane

#### Scenario: Export unchanged
- **WHEN** the user exports in the Assembled view
- **THEN** the exported files are the same print sheet or halves as in the Print sheet view

#### Scenario: Not offered without the split
- **WHEN** two-halves mode is off
- **THEN** no view choice is shown

### Requirement: Open gap
In the assembled view the user SHALL be able to open the halves apart along the vertical axis by a distance from 0 to 15 mm to inspect the pins, holes and channel. The default is 0.

#### Scenario: Open
- **WHEN** the gap is set to 6 mm
- **THEN** the top half moves up 3 mm and the bottom half down 3 mm, and the pins stay at the mating plane

#### Scenario: Closed
- **WHEN** the gap is 0
- **THEN** the halves touch exactly at the mating plane

### Requirement: View memory
The chosen view and gap SHALL be remembered with the other viewport preferences.

#### Scenario: Reload
- **WHEN** the user reloads the page after choosing Assembled
- **THEN** the assembled view is used again as soon as two halves exist
