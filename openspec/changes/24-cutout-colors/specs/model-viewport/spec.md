# Spec Delta

## MODIFIED Requirements

### Requirement: Cutting tool overlay
In Cutout mode the 3D view SHALL show each visible cutout's shape as a translucent body in that cutout's own colour, different from the model colour, standing where it is cut, so the user sees what is being subtracted and which cutout it is. The bodies are preview only and SHALL NOT be part of the model measurements, volume or any export.

#### Scenario: Rectangle and part shown
- **WHEN** a rectangle or an imported part is added to a cutout
- **THEN** a translucent body of that shape is drawn inside its pocket

#### Scenario: Colour of each tool
- **WHEN** several cutouts exist
- **THEN** each translucent body has the colour of its cutout, the same as the swatch in the list and the shape in the top view

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
