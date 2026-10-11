## MODIFIED Requirements

### Requirement: Cutting mode
For imported shapes the user SHALL choose between a projected pocket (footprint extruded to depth) and a true 3D pocket that is the part itself, as it is, standing on the pocket floor.

#### Scenario: Projected
- **WHEN** projected mode is selected
- **THEN** the pocket has vertical walls following the shape's outline

#### Scenario: True 3D
- **WHEN** 3D mode is selected
- **THEN** the pocket follows the shape's volume

#### Scenario: True 3D is the part as it is
- **WHEN** 3D mode is selected for a part whose width changes with height
- **THEN** the pocket section at each height equals the part's section at that height, with no steps or layers added

#### Scenario: Clearance in 3D
- **WHEN** clearance is 0.5 mm in 3D mode
- **THEN** the pocket surface is 0.5 mm away from the part's surface in every direction and never goes below the pocket floor

#### Scenario: Open above the part
- **WHEN** the part is lower than the top of the bin
- **THEN** the pocket above the part has the part's silhouette and is open to the top face

### Requirement: Mesh robustness
Non-manifold imported meshes SHALL be repaired where possible (merging duplicate vertices and gaps within tolerance, fixing orientation, closing holes in the surface); if the mesh is still not a valid solid, its cross-sections SHALL be closed and used to build the pocket in both modes (a stepped approximation, since no solid exists), and the user SHALL be told. The convex hull of the outline SHALL be used only when no section can be closed.

#### Scenario: Open mesh
- **WHEN** an STL has duplicate vertices but is otherwise closed
- **THEN** it is accepted after welding

#### Scenario: Mesh with a hole is cut exactly
- **WHEN** an imported mesh has a hole in its surface
- **THEN** the hole is closed and the part is cut exactly as in the closed case (no steps), and a warning is shown

#### Scenario: Mesh that cannot be closed keeps its shape
- **WHEN** a mesh is still not a valid solid after closing holes
- **THEN** the pocket follows the part's real cross-sections, not its convex hull, and a warning is shown

#### Scenario: Unusable mesh
- **WHEN** no cross-section of the mesh can be closed
- **THEN** the convex hull outline is used and the warning says so
