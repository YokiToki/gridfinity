# keychain-text Specification

## Purpose
Defines the text layer of a keychain: content, fonts, embossing or engraving, and placement.

## Requirements

### Requirement: Text layer
The user SHALL be able to add text of one or more lines to a keychain, with a font, a size in millimetres (cap height), letter spacing, line spacing, alignment and rotation. The text SHALL be shown in the 3D preview and in the placement editor to scale.

#### Scenario: Add text
- **WHEN** the user turns on the text layer and types "ANNA"
- **THEN** the lettering appears on the keychain in the preview and in the editor

#### Scenario: Multiple lines
- **WHEN** the text contains a line break
- **THEN** the lines are stacked with the chosen line spacing and alignment

#### Scenario: Size
- **WHEN** the size is 8 mm
- **THEN** capital letters are 8 mm high in the model

### Requirement: Emboss and engrave
Text SHALL be either embossed, raised by a chosen height above the surface under it, or engraved, cut down by a chosen depth. Engraving SHALL never go below the minimum rim height or through the base plate.

#### Scenario: Emboss
- **WHEN** the mode is Emboss with height 0.6 mm
- **THEN** the top of the letters is 0.6 mm above the surrounding surface

#### Scenario: Engrave
- **WHEN** the mode is Engrave with depth 0.5 mm
- **THEN** the letters are cut 0.5 mm into the surface

#### Scenario: Depth clamp
- **WHEN** the engraving depth is larger than the available thickness
- **THEN** the letters are cut only down to the minimum height and the model stays a valid solid

### Requirement: Fonts
The app SHALL offer at least 20 popular font families, grouped by style, all covering Latin and Cyrillic, together with the generic families, and SHALL let the user load a font file (TTF, OTF or WOFF) from the device, which is kept in the browser and restored after a reload. The families SHALL be files of the app itself, loaded when chosen, and no font SHALL be downloaded from a third-party server. A file that cannot be read as a font SHALL produce a localized error and leave the previous font in place.

#### Scenario: Bundled font
- **WHEN** the user picks one of the bundled families
- **THEN** the text is drawn with that font and no request goes to another host

#### Scenario: Cyrillic
- **WHEN** the text is "Анна" and a bundled family is chosen
- **THEN** the letters are drawn in that family, not in a fallback

#### Scenario: Grouped list
- **WHEN** the user opens the font list
- **THEN** the families are grouped as Sans, Serif, Display, Handwriting and Mono

#### Scenario: Own font
- **WHEN** the user loads a TTF file
- **THEN** it appears in the font list, is used for the text, and is still available after a reload

#### Scenario: Bad font file
- **WHEN** the user loads a file that is not a font
- **THEN** an error banner is shown and the font does not change

### Requirement: Text placement
The text SHALL be positioned in the placement editor by dragging and by typing exact X and Y, and SHALL keep its relative position when the keychain size changes. Text MAY lie on the relief or on the base plate outside the silhouette; the part outside the base plate SHALL be clipped with a warning.

#### Scenario: Drag
- **WHEN** the user drags the text in the editor
- **THEN** the X and Y fields update and the model regenerates with the text there

#### Scenario: On the plate
- **WHEN** the text is placed on the base plate outside the silhouette
- **THEN** it is embossed or engraved into the plate surface

#### Scenario: Outside the plate
- **WHEN** part of the text lies outside the base plate
- **THEN** a warning says so and that part is not generated

### Requirement: Text and two halves
In two-halves mode the text SHALL appear on the top half only, so that the visible side of the assembled keychain carries it.

#### Scenario: Top half only
- **WHEN** two halves are on and the text is embossed
- **THEN** the top half has the lettering and the bottom half has none

### Requirement: Fine text warning
When the strokes of the text are thinner than four grid cells, the app SHALL show the effective cell size and offer to raise the resolution within the triangle budget.

#### Scenario: Warning
- **WHEN** a small size makes the letter strokes thinner than four cells
- **THEN** a warning appears with a button that raises the resolution
