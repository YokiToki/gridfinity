# Spec Delta

## ADDED Requirements

### Requirement: Keychain modes and routes
Keychain Master SHALL be organised into modes like Gridfinity Master: a mode chooser at its root path, one route per mode, and the product's mode switcher in the top bar. Unknown paths under the product SHALL return to its chooser.

#### Scenario: Routes
- **WHEN** the user opens the Keychain Master path
- **THEN** the mode chooser is shown, and the Image and Shape modes open at their own paths

#### Scenario: Mode switcher
- **WHEN** a Keychain Master mode is open
- **THEN** the top bar shows the product switcher and a mode switcher with Image and Shape, and the Gridfinity modes are not shown

#### Scenario: Unknown path
- **WHEN** the user opens an unknown path under Keychain Master
- **THEN** the Keychain Master mode chooser is shown
