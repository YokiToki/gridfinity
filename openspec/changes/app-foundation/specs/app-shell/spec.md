# Spec Delta

## Purpose
Defines the application layout, mode navigation and shared UI controls that every generator mode builds on.

## ADDED Requirements

### Requirement: Mode navigation
The app SHALL offer three modes — Box, Baseplate and Cutout — selectable from the top bar, each reachable by its own URL path.

#### Scenario: Switch mode
- **WHEN** the user selects Baseplate in the mode switcher
- **THEN** the URL path changes to the baseplate route and the baseplate parameter panel is shown

#### Scenario: Direct link
- **WHEN** the user opens the baseplate URL directly
- **THEN** the baseplate mode is shown without first visiting another mode

#### Scenario: Unavailable mode
- **WHEN** a mode has no implementation yet
- **THEN** a localized placeholder is shown in place of its parameter panel and the 3D viewport stays usable

### Requirement: Per-mode persisted state
The app SHALL keep each mode's parameters independently and restore them after a page reload.

#### Scenario: Restore on reload
- **WHEN** the user changes baseplate parameters and reloads the page
- **THEN** the baseplate parameters have the same values as before the reload

#### Scenario: Corrupt storage
- **WHEN** persisted state cannot be parsed
- **THEN** the mode falls back to its default parameters and the app remains usable

### Requirement: Shared parameter controls
Parameter panels SHALL be composed from shared controls: numeric field with unit label, segmented choice, on/off toggle and collapsible section.

#### Scenario: Numeric clamping
- **WHEN** the user enters a value outside a control's allowed range
- **THEN** the value is clamped to the nearest bound and the control shows the clamped value

#### Scenario: Keyboard use
- **WHEN** the user tabs through a panel
- **THEN** every control is reachable and operable from the keyboard
