# Spec Delta

## REMOVED Requirements

### Requirement: Holes

## ADDED Requirements

### Requirement: Areas
Every enclosed background region of the silhouette (an area) SHALL be shown with a stable numeric id on the mask preview and in a list in the panel; the word "hole" SHALL NOT be used for them. Each area has a mode: follow the relief (filled, the default), open (cut through) or level (a flat surface at a chosen height). The user SHALL be able to select an area from the list or by clicking it on the mask preview.

#### Scenario: Open an area
- **WHEN** the user sets area 3 to Open
- **THEN** the relief has an opening where area 3 is and the other areas stay solid

#### Scenario: Stable ids
- **WHEN** a setting that does not change the set of areas, such as dilate, changes
- **THEN** the ids of the areas and their settings stay the same

#### Scenario: Select on the preview
- **WHEN** the user clicks an area on the mask preview
- **THEN** its row in the list is selected and the area is outlined on the preview

#### Scenario: Apply to all
- **WHEN** the user chooses Apply to all with mode Open
- **THEN** every area is set to Open

#### Scenario: Stored settings of a vanished area
- **WHEN** a setting changes so that an area with stored settings no longer exists
- **THEN** a warning names the id and the stored settings are ignored

#### Scenario: Migration
- **WHEN** a saved keychain has areas kept open from the previous version
- **THEN** those areas are loaded as Open and all others as Follow
