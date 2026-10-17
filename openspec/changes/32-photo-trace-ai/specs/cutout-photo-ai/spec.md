# Spec Delta

## Purpose
Defines the optional neural silhouette engine for photo cutouts and the guarantee that the classic detection stays as the unchanged baseline.

## ADDED Requirements

### Requirement: Classic baseline unchanged
The classic silhouette detection described in `cutout-photo-trace` SHALL remain available, SHALL be the default engine, SHALL work without any download or network access, and SHALL produce exactly the same silhouettes as before this change for the same photo, corners, paper and settings.

#### Scenario: Default engine
- **WHEN** the photo dialog is opened and a photo is chosen
- **THEN** the classic engine is selected and no model is requested

#### Scenario: Unchanged result
- **WHEN** the two reference photos (with and without flash) are processed with the classic engine
- **THEN** each gives the same three silhouettes, with the same sizes and areas, as the recorded baseline

#### Scenario: Offline
- **WHEN** the device has no network and the classic engine is used
- **THEN** detection works as before

### Requirement: Engine choice
On the silhouette step the user SHALL be able to choose the detection engine, Classic or AI. The choice SHALL apply to the current photo and SHALL be kept while the dialog state lives (closing and reopening the dialog keeps it). Selection by click, the list with sizes, the sensitivity-independent steps (margin, depth, clearance) and the creation of cutouts SHALL work the same for both engines.

#### Scenario: Switching engines
- **WHEN** the user switches from Classic to AI and the model is ready
- **THEN** the silhouettes are recomputed by the AI engine and shown in the same view and list, numbered top to bottom

#### Scenario: Shared downstream
- **WHEN** silhouettes found by the AI engine are kept and Create is pressed
- **THEN** one cutout per kept silhouette is created exactly as for the classic engine, in true scale and position, with the bin footprint fitted

#### Scenario: Sensitivity
- **WHEN** the AI engine is active
- **THEN** the sensitivity control, which belongs to the classic detector, is not offered for it, and the margin still applies

### Requirement: Model download and consent
The AI engine SHALL need a neural model that is downloaded on demand. Before the first download the app SHALL show the model's name, size, source host and licence and SHALL download only after the user confirms. It SHALL show progress, allow cancelling, keep the model in the browser's storage for later sessions when storage is available, and let the user see its size and delete it. If the download or the model fails, the classic engine SHALL stay usable and the failure SHALL be shown.

#### Scenario: Consent first
- **WHEN** the user chooses AI for the first time
- **THEN** a dialog states the download size and that the source host sees the user's address, and nothing is downloaded until the user confirms

#### Scenario: Cached
- **WHEN** the model was downloaded earlier and the storage is intact
- **THEN** choosing AI starts at once without a new download

#### Scenario: Delete
- **WHEN** the user deletes the model in the model dialog
- **THEN** its stored data is removed and choosing AI asks for consent again

#### Scenario: Failure
- **WHEN** the download is interrupted or the checksum of the file does not match
- **THEN** an error says so, the file is not used, and the dialog stays on the classic engine

#### Scenario: Storage unavailable
- **WHEN** the browser refuses persistent storage
- **THEN** the model works for the session and a notice says it will be downloaded again next time

### Requirement: Privacy
The photo, the straightened image and the masks SHALL be processed in the browser only and SHALL NOT be sent anywhere by the AI engine. The only network traffic added by the AI engine SHALL be the download of the model files, from a fixed, versioned location, after consent. The user interface and the References page SHALL say so, and SHALL list every model with its licence and source. Only models under MIT, Apache-2.0, BSD or CC0 licences SHALL be used.

#### Scenario: No image upload
- **WHEN** a photo is processed by the AI engine
- **THEN** no network request carries image data

#### Scenario: Licence list
- **WHEN** the References page is opened
- **THEN** each model used by the app is listed with its licence and source

### Requirement: Silhouettes from the network
The AI engine SHALL run the straightened sheet through the model, turn its foreground mask into silhouettes with the same cleanup as the classic path (enclosed gaps filled, small specks and tiny silhouettes dropped, a margin along the paper edge ignored, one silhouette per separate object), and SHALL return them in the same form as the classic engine. Soft shadows beside a tool SHALL NOT be part of its silhouette.

#### Scenario: Reference photos
- **WHEN** each of the two reference photos is processed by the AI engine
- **THEN** three silhouettes are found, and each tool's width and height are within 1 mm of the baseline's

#### Scenario: Shadow
- **WHEN** a tool casts a soft shadow beside it
- **THEN** the silhouette follows the tool and not its shadow

#### Scenario: Margin
- **WHEN** the margin is 3 mm
- **THEN** nothing within 3 mm of the paper edge is a silhouette

#### Scenario: No objects
- **WHEN** the model finds nothing
- **THEN** the message for no silhouettes is shown and Create is disabled

### Requirement: Accurate edge
The AI engine SHALL place the silhouette edge by the paper-colour test within a narrow band around the network's mask and SHALL use the network's own edge only where that test does not separate the object from the paper. The sizes it reports SHALL stay within 0.5 mm of the classic result wherever the classic result is accurate.

#### Scenario: Edge from the colour test
- **WHEN** a tool contrasts with the paper
- **THEN** its silhouette edge follows the colour edge, not the coarser edge of the network's mask

#### Scenario: Dark part in shadow
- **WHEN** a dark part of a tool merges with its own shadow so that the colour test cannot find its edge
- **THEN** the network's edge is used along that stretch and the silhouette is still one piece

#### Scenario: True scale
- **WHEN** a 40 × 20 mm rectangle lies on the paper and the corners are placed correctly
- **THEN** the AI silhouette measures 40 × 20 mm within 0.5 mm

### Requirement: Compare engines
The user SHALL be able to compare the two engines on the straightened view: the silhouettes of the inactive engine are drawn as outlines over the view, and a table lists each tool's width and height for both engines and the difference.

#### Scenario: Outlines
- **WHEN** compare is switched on
- **THEN** the outlines of the other engine appear as dashed lines over the straightened sheet

#### Scenario: Sizes
- **WHEN** compare is on
- **THEN** each silhouette's size is shown for both engines with the difference in mm

#### Scenario: Off by default
- **WHEN** the dialog is opened
- **THEN** compare is off and costs nothing

### Requirement: Language
All text of the AI engine, the model dialog and the compare view SHALL be available in every language of the app.

#### Scenario: Russian
- **WHEN** the interface language is Russian
- **THEN** the engine switch, the consent dialog, progress, errors and the compare table are in Russian
