## MODIFIED Requirements

### Requirement: Cutting mode
For imported shapes the user SHALL choose between a projected pocket (footprint extruded to depth) and a true 3D pocket that follows the shape's volume closed in the vertical direction, so that the part can be lowered straight into it.

#### Scenario: Projected
- **WHEN** projected mode is selected
- **THEN** the pocket has vertical walls following the shape's outline

#### Scenario: True 3D
- **WHEN** 3D mode is selected
- **THEN** the pocket follows the shape's volume, closed in the vertical direction

#### Scenario: True 3D follows the shape
- **WHEN** 3D mode is selected for a part whose width changes with height
- **THEN** the pocket section at each height is at least the part's section at that height and the pocket is a stepped profile of the part, not a vertical extrusion of its widest outline

#### Scenario: Undercuts are closed
- **WHEN** 3D mode is selected for a part with an overhang or a notch on its side
- **THEN** no material remains under the overhang inside the pocket, so lowering the part from above does not collide with the bin

#### Scenario: Clearance in 3D
- **WHEN** clearance is 0.5 mm in 3D mode
- **THEN** every section of the pocket is 0.5 mm larger than the part's section on all sides in the plane

#### Scenario: Open above the part
- **WHEN** the part is lower than the top of the bin
- **THEN** the pocket above the part has the part's full outline and is open to the top face

### Requirement: Mesh robustness
Non-manifold imported meshes SHALL be repaired where possible (merging duplicate vertices, fixing orientation); if the mesh is still not a valid solid, its cross-sections SHALL be closed and used to build the pocket in both modes, and the user SHALL be told. The convex hull of the outline SHALL be used only when no section can be closed.

#### Scenario: Open mesh
- **WHEN** an STL has duplicate vertices but is otherwise closed
- **THEN** it is accepted after welding

#### Scenario: Mesh with a gap keeps its shape
- **WHEN** an imported mesh has a small gap in its surface and is not a valid solid
- **THEN** the pocket follows the part's real outline, not its convex hull, and a warning is shown

#### Scenario: Unusable mesh
- **WHEN** no cross-section of the mesh can be closed
- **THEN** the convex hull outline is used and the warning says so
