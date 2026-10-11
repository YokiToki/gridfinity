# app-shell Specification

## Purpose
Defines the application layout, mode navigation and shared UI controls that every generator mode builds on.

## Requirements

### Requirement: Mode navigation
Inside Gridfinity Master the app SHALL offer three modes — Box, Baseplate and Cutout — selectable from the top bar, each reachable by its own URL path under `/gridfinity`.

#### Scenario: Switch mode
- **WHEN** the user selects Baseplate in the mode switcher
- **THEN** the URL path changes to the Gridfinity baseplate route and the baseplate parameter panel is shown

#### Scenario: Direct link
- **WHEN** the user opens the Gridfinity baseplate URL directly
- **THEN** the baseplate mode is shown without first visiting another mode

#### Scenario: Unavailable mode
- **WHEN** a mode or product has no implementation yet
- **THEN** a localized placeholder is shown in place of its parameter panel and the 3D viewport stays usable

### Requirement: Start page
The app SHALL open on a start page at the root path that lets the user choose Gridfinity Master or Keychain Master, each as a card with an icon, a short localized description and a link. Gridfinity Master SHALL have its own start page at `/gridfinity` where the user chooses Box, Baseplate or Cutout.

#### Scenario: Choose a product
- **WHEN** the user opens the root URL and selects the Keychain Master card
- **THEN** the keychain route opens and the product switcher shows Keychain Master as active

#### Scenario: Choose a mode
- **WHEN** the user opens `/gridfinity` and selects the Cutout card
- **THEN** the cutout route opens and the mode switcher in the top bar shows Cutout as active

#### Scenario: Return to start
- **WHEN** the user selects the logo in the top bar from any section
- **THEN** the root start page is shown and every section's parameters stay stored

#### Scenario: Continue where you left off
- **WHEN** the user last worked in a keychain and opens the root page
- **THEN** a "Continue" link to Keychain Master is shown with the saved time

#### Scenario: Start page has no viewport
- **WHEN** a start page is shown
- **THEN** no 3D viewport or parameter panel is rendered and no geometry is computed

#### Scenario: Unknown path
- **WHEN** the user opens a path that matches no route
- **THEN** the root start page is shown

### Requirement: Per-mode persisted state
The app SHALL keep each mode's parameters independently and restore them after a page reload.

#### Scenario: Restore on reload
- **WHEN** the user changes baseplate parameters and reloads the page
- **THEN** the baseplate parameters have the same values as before the reload

#### Scenario: Corrupt storage
- **WHEN** persisted state cannot be parsed
- **THEN** the mode falls back to its default parameters and the app remains usable

### Requirement: Shared parameter controls
Parameter panels SHALL be composed from shared controls: numeric field with unit label, segmented choice, on/off toggle and collapsible section. Control labels SHALL never be clipped in English or Russian at the 380 px panel width.

#### Scenario: Numeric clamping
- **WHEN** the user enters a value outside a control's allowed range
- **THEN** the value is clamped to the nearest bound and the control shows the clamped value

#### Scenario: Keyboard use
- **WHEN** the user tabs through a panel
- **THEN** every control is reachable and operable from the keyboard

#### Scenario: Long labels
- **WHEN** a segmented control has labels that do not fit on one line, such as the Russian "В каждой ячейке"
- **THEN** the full label is still readable, by wrapping inside its segment or by using a shorter label

### Requirement: Product sections
The app SHALL be organised into product sections, Gridfinity Master and Keychain Master, each with its own routes, localized name and description, and its own persisted state. Language and display units SHALL be shared by all sections.

#### Scenario: Switch product
- **WHEN** the user selects Keychain Master in the product switcher
- **THEN** the keychain route opens, the top bar shows Keychain Master as the active product and the Gridfinity mode switcher is hidden

#### Scenario: Products do not share parameters
- **WHEN** the user changes baseplate parameters, opens Keychain Master and returns
- **THEN** the baseplate parameters are unchanged

#### Scenario: Global settings
- **WHEN** the user switches the language or mm/in in one section
- **THEN** the other section uses the same language and unit

#### Scenario: Legacy links
- **WHEN** the user opens `#/baseplate`, `#/box` or `#/cutout`
- **THEN** the app shows the matching `/gridfinity/...` route

### Requirement: Start page illustrations
Each mode card on the Gridfinity start page SHALL show an isometric illustration that is a render of that mode's actual model (a 2×2 unit part with default settings), not a schematic drawing. Illustrations SHALL be static vector images, SHALL follow the app's colour tokens, and SHALL NOT require WebGL, geometry computation or network requests on the start page.

#### Scenario: Renders match the editor
- **WHEN** the Baseplate card is shown
- **THEN** its illustration is a 2×2 baseplate with the standard cell pockets and the default corner fastener holes, as the editor produces by default

#### Scenario: No runtime geometry
- **WHEN** the start page is opened
- **THEN** no worker is started, no WASM is loaded and no WebGL context is created

#### Scenario: Theme tokens
- **WHEN** a colour token of the theme changes
- **THEN** the illustrations change colour with it without regenerating the image files

#### Scenario: Crisp on any display
- **WHEN** the page is shown on a high-density display or zoomed to 200 %
- **THEN** illustration edges stay sharp

#### Scenario: Decorative
- **WHEN** a screen reader reads a card
- **THEN** the illustration is skipped and the card is announced by its title and description

#### Scenario: Weight
- **WHEN** the production build is made
- **THEN** each illustration is at most 60 KB uncompressed
