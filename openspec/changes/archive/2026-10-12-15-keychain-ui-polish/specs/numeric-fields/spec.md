# Spec Delta

## Purpose
Defines how numeric input fields behave across the app.

## ADDED Requirements

### Requirement: Stepper buttons
Every numeric field SHALL show a decrease and an increase button next to the value, in every mode of every product. A click changes the value by the field's step, holding the button repeats the change, and holding Shift multiplies the step by 10. The value SHALL stay within the field's limits and the button that would exceed a limit SHALL be disabled.

#### Scenario: Increase
- **WHEN** the user clicks the increase button of a field with step 0.5 and value 2
- **THEN** the value becomes 2.5 and the model updates once

#### Scenario: Hold to repeat
- **WHEN** the user holds the increase button for one second
- **THEN** the value keeps increasing at a steady rate until released

#### Scenario: Limit
- **WHEN** the value equals the maximum of the field
- **THEN** the increase button is disabled and the decrease button is enabled

#### Scenario: Shift
- **WHEN** the user clicks the increase button with Shift held
- **THEN** the value changes by ten steps

### Requirement: Stepper units
In a length field the step SHALL be applied in the display unit and the stored value SHALL stay in millimetres.

#### Scenario: Inches
- **WHEN** the display unit is inches and the user presses the increase button of a field whose step is 1 mm
- **THEN** the shown value grows by 0.039 in and the stored value by 1 mm

### Requirement: Accessible steppers
The buttons SHALL have localized accessible names that include the field label, be at least 32 px high and wide, and be reachable by keyboard; the arrow keys in the text input SHALL keep working.

#### Scenario: Names
- **WHEN** a screen reader reads the buttons of the field "Hole diameter"
- **THEN** they are announced as "Decrease: Hole diameter" and "Increase: Hole diameter"
