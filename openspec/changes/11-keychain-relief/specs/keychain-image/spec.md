# Spec Delta

## Purpose
Defines how a keychain starts from a user-supplied image and becomes a clean binary silhouette.

## ADDED Requirements

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

### Requirement: Holes
Every enclosed background region (hole) SHALL be shown with a stable numeric id on the mask preview. Holes are filled solid by default; the user SHALL be able to keep individual holes open.

#### Scenario: Keep a hole open
- **WHEN** the user keeps hole 3 open
- **THEN** the relief has an opening where hole 3 is and the other holes remain solid

#### Scenario: Stable ids
- **WHEN** a non-hole setting such as dilate changes without changing the set of holes
- **THEN** the ids of the holes stay the same
