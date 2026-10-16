# Spec Delta

## MODIFIED Requirements

### Requirement: Start page illustrations
Each mode card on the Gridfinity and Keychain start pages and each product card on the root start page SHALL show an isometric illustration that is a render of an actual model produced by the app (a small part with default settings), not a schematic drawing or an icon. The Gridfinity product card SHALL show the box; the Keychain product card SHALL show an image-mode keychain; the Keychain Image and Shape cards SHALL each show a render of their own mode. The image-mode keychain illustration SHALL show a shape with a complex organic outline (a paw print), not a circle or other plain geometric figure. Illustrations SHALL be static vector images, SHALL follow the app's colour tokens, and SHALL NOT require WebGL, geometry computation or network requests on the start page.

#### Scenario: Renders match the editor
- **WHEN** the Baseplate card is shown
- **THEN** its illustration is a 2×2 baseplate with the standard cell pockets and the default corner fastener holes, as the editor produces by default

#### Scenario: Product cards
- **WHEN** the root start page is shown
- **THEN** the Gridfinity card shows the box illustration and the Keychain card shows the image-mode keychain illustration

#### Scenario: Keychain mode cards
- **WHEN** the Keychain start page is shown
- **THEN** the Image card shows a relief keychain in the shape of a paw print with a ring eyelet and the Shape card shows a keychain with a geometric outline and rim, each a render of what that mode produces

#### Scenario: Smooth outline
- **WHEN** the Keychain Image illustration is viewed at 200 % zoom or on a high-density display
- **THEN** its outer outline and the edges between shaded areas are smooth curves, with no visible pixel stairs

#### Scenario: Cards stay level
- **WHEN** the root start page is shown
- **THEN** the drawn height of the Keychain illustration equals that of the Gridfinity box illustration

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
