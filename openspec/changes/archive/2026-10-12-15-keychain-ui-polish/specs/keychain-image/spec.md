# Spec Delta

## ADDED Requirements

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
