# Spec Delta

## ADDED Requirements

### Requirement: Editor axes legibility
The placement editor SHALL draw its rulers and axis labels inside the drawing with a margin from every edge, with labels large enough to read at the panel width and with the axes and grid drawn heavier than before, the axes through the origin heavier than the grid. Nothing of the editor, including the rulers, SHALL be covered by the sticky export block when the panel is scrolled to the end.

#### Scenario: Rulers visible
- **WHEN** the panel is scrolled until the editor is at the bottom of the visible area
- **THEN** the bottom ruler and its labels are fully visible above the export block

#### Scenario: Weight
- **WHEN** the editor is shown
- **THEN** the axis lines are clearly thicker than the grid lines and the labels are in the primary text colour
