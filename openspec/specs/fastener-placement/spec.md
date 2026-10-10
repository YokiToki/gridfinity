# fastener-placement Specification

## Purpose
Defines how magnet pockets and screw holes are configured and positioned on generated models.

## Requirements

### Requirement: Placement modes
Magnets and screw holes SHALL each support the modes None, Corner, Full and Manual.

#### Scenario: Full
- **WHEN** magnets are set to Full on a 2×2 footprint
- **THEN** every cell receives holes at its four standard positions (13 mm from the cell centre on both axes)

#### Scenario: Corner
- **WHEN** magnets are set to Corner on a 2×2 footprint
- **THEN** only the four outermost cell corners of the footprint receive holes

#### Scenario: None
- **WHEN** screws are set to None
- **THEN** no screw holes are generated

### Requirement: Hole dimensions
The user SHALL be able to choose magnet diameter, magnet depth and screw diameter, with presets for common sizes and a custom option; dimensions SHALL include a configurable fit tolerance.

#### Scenario: Preset
- **WHEN** the user picks the 6×2 mm magnet preset
- **THEN** pocket diameter is 6 mm plus tolerance and depth is 2 mm plus tolerance

#### Scenario: Too large
- **WHEN** a hole would break through a wall or overlap another hole
- **THEN** the field shows a localized warning and the hole is still generated unless it makes the solid invalid

### Requirement: Manual placement
In Manual mode the user SHALL add, move and remove individual holes in a 2D view of the footprint, with snapping to the standard positions and entry of exact coordinates.

#### Scenario: Add by click
- **WHEN** the user clicks a snap position in the 2D editor
- **THEN** a hole is added there and appears in the 3D preview

#### Scenario: Exact coordinates
- **WHEN** the user edits a hole's X/Y values in the list
- **THEN** the hole moves to those coordinates relative to the footprint origin

#### Scenario: Switch from Full to Manual
- **WHEN** the user switches from Full to Manual
- **THEN** the existing holes are kept as editable manual holes

### Requirement: Holes persisted and exported
Manually placed holes SHALL persist with the mode's parameters and SHALL be present in exported files.

#### Scenario: Reload
- **WHEN** the page is reloaded
- **THEN** manually placed holes are restored at the same positions
