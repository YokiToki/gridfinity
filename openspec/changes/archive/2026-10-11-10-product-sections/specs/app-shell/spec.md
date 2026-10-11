# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
