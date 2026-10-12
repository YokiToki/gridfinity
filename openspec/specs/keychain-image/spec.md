# keychain-image Specification

## Purpose
Defines how a keychain starts from a user-supplied image and becomes a clean binary silhouette.

## Requirements

### Requirement: Image import
Keychain Master SHALL accept a raster image (PNG, JPEG, WebP) or SVG by file picker or drag-and-drop, decode it locally in the browser and never upload it. Unsupported or undecodable files SHALL produce a localized error and leave the previous image in place.

#### Scenario: Import
- **WHEN** the user drops a JPEG on the panel or viewport
- **THEN** its silhouette preview appears and a relief is generated with default settings

#### Scenario: Bad file
- **WHEN** the user selects a text file
- **THEN** an error banner is shown and the previous keychain is unchanged

#### Scenario: Large image
- **WHEN** the image is larger than the working limit (4096 px on the long side)
- **THEN** it is downscaled before processing and the user is told

### Requirement: Image persistence
The imported image and keychain parameters SHALL be restored after a reload, with the image stored outside localStorage. If storage is unavailable the keychain SHALL still work for the session and the user SHALL be warned it will not persist.

#### Scenario: Reload
- **WHEN** the user imports an image, changes the threshold and reloads
- **THEN** the same image and threshold are restored and the same relief is shown

#### Scenario: Storage unavailable
- **WHEN** persistent storage cannot be used
- **THEN** the keychain works in memory and a warning is shown

### Requirement: Silhouette
The app SHALL convert the image to a binary silhouette with these controls: threshold (automatic by default, adjustable), invert, close gap, fill holes, remove specks below a size, and dilate/erode. The mask SHALL be previewed with the current settings.

#### Scenario: Threshold
- **WHEN** the user moves the threshold slider
- **THEN** the mask preview and the 3D relief update

#### Scenario: Transparent PNG
- **WHEN** the image has an alpha channel
- **THEN** alpha is used as the silhouette by default instead of brightness

#### Scenario: Invert
- **WHEN** the user turns Invert on
- **THEN** dark and light regions swap roles in the mask

#### Scenario: Empty mask
- **WHEN** the settings produce an empty mask
- **THEN** a localized message explains it, no geometry is generated and the previous mesh stays

### Requirement: Enlarged mask preview
The mask preview SHALL have an Enlarge control that opens a large view of the same mask, centred over the 3D preview, with larger numbers on every enclosed region. The large view SHALL close with a close button, with Esc and by clicking outside it, and SHALL return focus to the Enlarge control.

#### Scenario: Enlarge
- **WHEN** the user presses Enlarge on the mask preview
- **THEN** the mask is shown at about 70 % of the viewport size with the region numbers readable

#### Scenario: Close
- **WHEN** the user presses Esc while the large view is open
- **THEN** it closes and focus returns to the Enlarge control

#### Scenario: Live
- **WHEN** a silhouette setting changes while the large view is open
- **THEN** the large mask updates with it

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
