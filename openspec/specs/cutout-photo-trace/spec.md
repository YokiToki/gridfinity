# cutout-photo-trace Specification

## Purpose
Defines how a photo of objects on a sheet of paper becomes cutouts at true scale.

## Requirements

### Requirement: Photo and paper
The Cutout mode SHALL let the user choose a photo, and then, on the alignment step, the paper that appears in it: US Letter, A4 or a custom width and length in mm, in portrait or landscape. When the sheet can be found in the photo, the paper size and orientation SHALL be proposed from its proportions and SHALL remain changeable. Photos in PNG, JPEG and WebP SHALL be accepted; anything else SHALL be refused with a message. The photo SHALL be processed in the browser only and SHALL NOT be sent anywhere.

#### Scenario: Paper presets
- **WHEN** the user picks A4 landscape
- **THEN** the paper is 297 × 210 mm; Letter is 279.4 × 215.9 mm; a custom paper uses the entered size

#### Scenario: Paper on the alignment step
- **WHEN** the photo has been read
- **THEN** the dialog moves to the alignment step, where the paper size and orientation are chosen next to the corners

#### Scenario: Paper proposed from the photo
- **WHEN** the photo shows an upright A4 sheet
- **THEN** A4 portrait is preselected, and the user can change it

#### Scenario: Unsupported file
- **WHEN** the user chooses a file that is not a readable image
- **THEN** a message says so and nothing else changes

#### Scenario: No network
- **WHEN** a photo is processed
- **THEN** no network request carries the image

### Requirement: Perspective alignment
The app SHALL propose the four corners of the paper automatically when it can find the sheet, and the user SHALL be able to adjust each corner at any time. The corners SHALL be shown as large transparent rings, so the corner itself stays visible. A corner SHALL be grabbed from the area near it inside the sheet and not only by its ring, and while it is dragged it SHALL follow the movement of the pointer without being covered by it. While a corner is being moved, a magnifier SHALL show the surroundings of that corner enlarged, away from the pointer. The app SHALL show the paper straightened to a top view at true scale (a perspective transform from the four corners to the paper rectangle), updating while dragging.

#### Scenario: Automatic corners
- **WHEN** the photo shows a white sheet on a darker table
- **THEN** the four corners are placed on the corners of the sheet within a small fraction of the photo size, without any action from the user

#### Scenario: Sheet not found
- **WHEN** the sheet cannot be found
- **THEN** the corners start inset from the photo edges and a message asks the user to place them

#### Scenario: Grab near the corner
- **WHEN** the user presses inside the sheet close to a corner and drags
- **THEN** that corner moves by the same amount as the pointer, and the ring is not hidden under the pointer

#### Scenario: Nearest corner
- **WHEN** the press is near two corners
- **THEN** the nearer corner is grabbed, and a press far from every corner moves nothing

#### Scenario: Magnifier
- **WHEN** a corner is being dragged or moved with the keyboard
- **THEN** a magnifier shows the area around that corner at several times the photo's scale with a mark at the corner, and it is placed so the pointer does not cover it

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
Objects SHALL be found in the straightened view by their difference from the paper in colour as well as in brightness, so that tools whose parts are as bright as the paper but coloured are still found whole. A soft, neutral darkening of the paper (a shadow cast by an object) SHALL NOT be taken as part of the object unless it is dark enough to belong to the tool. Detection SHALL tolerate uneven lighting. Small specks SHALL be ignored, enclosed gaps inside an object SHALL be filled, and a margin along the paper edges SHALL be ignored so the table and paper edge are not taken as objects. Each separate object SHALL be a silhouette with its size in mm.

#### Scenario: Uneven light
- **WHEN** one side of the paper is darker than the other because of lighting
- **THEN** the paper itself is not detected as an object

#### Scenario: Soft shadow
- **WHEN** a tool casts a soft shadow on the paper beside it
- **THEN** the silhouette follows the tool, not the shadow, so its size is within 2 mm of the tool's size in a photo taken without a shadow

#### Scenario: Coloured but bright parts
- **WHEN** a tool has coloured parts as bright as the paper, such as yellow handles under a flash
- **THEN** they belong to the tool's silhouette and the tool is not split into pieces

#### Scenario: Black and dark parts
- **WHEN** a tool is black or dark grey
- **THEN** it is found whole, including where its own shadow touches it

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

### Requirement: Shooting guidance
Before a photo is chosen the dialog SHALL explain how to take a good photo, as a short list: put the tools on a plain sheet of paper that lies on a contrasting surface (a dark or coloured table, not a white one), keep the tools apart from each other and from the paper's edge, shoot straight from above with the camera parallel to the table and the whole sheet in the frame, from a distance rather than close up, and use the flash or bright even light so that shadows are weak. The guidance SHALL be available in every language of the app and SHALL stay reachable after a photo has been chosen.

#### Scenario: Shown with the photo choice
- **WHEN** the dialog opens on the first step
- **THEN** the shooting guidance is visible next to the Choose photo button

#### Scenario: Still reachable later
- **WHEN** the user is on the alignment or silhouette step
- **THEN** a Tips control opens the same guidance without losing the current photo and settings

#### Scenario: Language
- **WHEN** the interface language is Russian
- **THEN** the guidance is in Russian
