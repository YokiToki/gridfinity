# Spec Delta

## ADDED Requirements

### Requirement: Cutout colours
Every cutout SHALL have a colour from a fixed palette of distinguishable colours, assigned automatically when the cutout is created or duplicated and kept for the life of the cutout. A new cutout SHALL take the first palette colour not used by another cutout in the list, and when all colours are used the palette repeats. The colour SHALL identify the cutout in the list, in the top view and in the 3D view. The colour is a preview aid only and SHALL NOT appear in any exported file.

#### Scenario: Distinct colours
- **WHEN** the user adds three cutouts
- **THEN** each of them has a different colour

#### Scenario: Stable colour
- **WHEN** the user reorders cutouts or deletes another cutout
- **THEN** the remaining cutouts keep their colours

#### Scenario: Reuse of a freed colour
- **WHEN** the user deletes a cutout and adds a new one
- **THEN** the new cutout takes the first colour that no remaining cutout uses

#### Scenario: Duplicate
- **WHEN** the user duplicates a cutout
- **THEN** the copy has its own colour, different from the original while a free colour exists

#### Scenario: Palette exhausted
- **WHEN** more cutouts exist than palette colours
- **THEN** colours repeat in palette order and every cutout still has a colour

#### Scenario: Old sessions
- **WHEN** a session saved without cutout colours is loaded
- **THEN** its cutouts get colours by list order

#### Scenario: Same colour everywhere
- **WHEN** a cutout is shown in the list, the top view and the 3D view
- **THEN** all three use its colour, and the selected cutout is additionally marked by more than colour (name highlight and outline)
