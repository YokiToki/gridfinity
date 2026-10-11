## ADDED Requirements

### Requirement: Cutting tool overlay
In Cutout mode the 3D view SHALL show each visible cutout's shape as a translucent body of a colour different from the model, standing where it is cut, so the user sees what is being subtracted. The bodies are preview only and SHALL NOT be part of the model measurements, volume or any export.

#### Scenario: Rectangle and part shown
- **WHEN** a rectangle or an imported part is added to a cutout
- **THEN** a translucent body of that shape is drawn inside its pocket

#### Scenario: Follows edits
- **WHEN** the user moves, rotates or hides a cutout
- **THEN** its body moves, rotates or disappears with it

#### Scenario: Imported part as it is
- **WHEN** a cutout is an imported STL, in either cutting mode
- **THEN** the translucent body is the part's own mesh, unchanged (also when the mesh is not a valid solid)

#### Scenario: Not exported
- **WHEN** the model is exported
- **THEN** the file contains the bin only and no tool body

#### Scenario: Toggle
- **WHEN** the user switches the tool overlay off
- **THEN** the bodies are hidden and the choice is remembered
