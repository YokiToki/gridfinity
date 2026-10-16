# Spec Delta

## Purpose
Defines how a photo of objects on a sheet of paper becomes cutouts at true scale.

## ADDED Requirements

### Requirement: Photo and paper
The Cutout mode SHALL let the user choose a photo and the paper that appears in it: US Letter, A4 or a custom width and length in mm, in portrait or landscape. Photos in PNG, JPEG and WebP SHALL be accepted; anything else SHALL be refused with a message. The photo SHALL be processed in the browser only and SHALL NOT be sent anywhere.

#### Scenario: Paper presets
- **WHEN** the user picks A4 landscape
- **THEN** the paper is 297 × 210 mm; Letter is 279.4 × 215.9 mm; a custom paper uses the entered size

#### Scenario: Unsupported file
- **WHEN** the user chooses a file that is not a readable image
- **THEN** a message says so and nothing else changes

#### Scenario: No network
- **WHEN** a photo is processed
- **THEN** no network request carries the image

### Requirement: Perspective alignment
The user SHALL mark the four corners of the paper in the photo by dragging corner handles, and the app SHALL show the paper straightened to a top view at true scale (a perspective transform from the four corners to the paper rectangle). The corners SHALL be adjustable at any time and the straightened view SHALL update while dragging.

#### Scenario: Straightened view
- **WHEN** the corners are placed on the corners of a sheet photographed at an angle
- **THEN** the preview shows the sheet as an upright rectangle of the paper's proportions, with objects at their true relative sizes

#### Scenario: True scale
- **WHEN** a 40 × 20 mm rectangle lies on the paper and the corners are placed correctly
- **THEN** the detected silhouette measures 40 × 20 mm within 0.5 mm

#### Scenario: Orientation
- **WHEN** the paper orientation is changed
- **THEN** the straightened view turns accordingly and the corner order is respected, so the result is not mirrored

#### Scenario: Degenerate corners
- **WHEN** the four points do not form a convex quadrilateral
- **THEN** the dialog says so and does not build a straightened view

### Requirement: Silhouette detection
Objects SHALL be found by their contrast against the paper in the straightened view: a pixel belongs to an object when it is darker (or differently coloured) than the local paper brightness by more than a sensitivity the user can change, so uneven lighting does not break detection. Small specks SHALL be ignored, enclosed gaps inside an object SHALL be filled, and a margin along the paper edges SHALL be ignored so the table and paper edge are not taken as objects. Each separate object SHALL be a silhouette with its size in mm.

#### Scenario: Uneven light
- **WHEN** one side of the paper is darker than the other because of lighting
- **THEN** the paper itself is not detected as an object

#### Scenario: Sensitivity
- **WHEN** the user raises the sensitivity
- **THEN** fainter objects are detected and the silhouettes update

#### Scenario: Edge margin
- **WHEN** the margin is 3 mm
- **THEN** nothing within 3 mm of the paper edge is detected

#### Scenario: No objects
- **WHEN** no silhouette is found
- **THEN** a message suggests changing the sensitivity and the Create button is disabled

### Requirement: Silhouette selection
The user SHALL choose which silhouettes to keep, by clicking them in the straightened view or by ticking them in a list that shows each one's size in mm. All are kept by default.

#### Scenario: Toggle by click
- **WHEN** the user clicks a silhouette in the straightened view
- **THEN** it is excluded (or included again) in the view and in the list

#### Scenario: Count
- **WHEN** silhouettes are excluded
- **THEN** the Create button shows how many cutouts will be made

### Requirement: Create cutouts from silhouettes
Pressing Create SHALL make one cutout per kept silhouette, using the chosen depth and clearance, keeping the silhouettes' positions and orientation as on the paper (a pocket seen from above matches the object seen from above), and SHALL fit the bin footprint to the new cutouts: the smallest whole number of Gridfinity units, in each direction, that contains them with the wall thickness and a margin. Existing cutouts are kept.

#### Scenario: Arrangement kept
- **WHEN** two tools lie 60 mm apart on the paper
- **THEN** their cutouts are 60 mm apart in the bin

#### Scenario: Minimal footprint
- **WHEN** the cutouts need 100 × 55 mm with the wall and margin
- **THEN** the bin is 3 × 2 units (126 × 84 mm) at a pitch of 42 mm

#### Scenario: Colours
- **WHEN** cutouts are created
- **THEN** each gets its own colour as for any new cutout

#### Scenario: Undo path
- **WHEN** the user dislikes the result
- **THEN** the new cutouts can be deleted like any other cutouts, and the dialog, reopened in the same session, still has the photo, corners and settings
