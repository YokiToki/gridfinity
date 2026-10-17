# Spec Delta

## ADDED Requirements

### Requirement: Beta notice
The site SHALL show a "beta" label next to the site name and SHALL give a disclaimer that the functionality is not fully tested: dimensions, fit and print settings may be wrong, the user should check the model and test-print a small part, and there is no warranty. The disclaimer SHALL be reachable from the label and repeated in the footer, in every language of the site.

#### Scenario: Label
- **WHEN** any page of the site is shown
- **THEN** the top bar shows the beta label next to the site name

#### Scenario: Disclaimer from the label
- **WHEN** the user selects the label
- **THEN** the disclaimer text is shown and can be dismissed with Escape or by selecting outside it

#### Scenario: Footer
- **WHEN** a start page is shown
- **THEN** its footer repeats the disclaimer

#### Scenario: Language
- **WHEN** the interface language is Russian
- **THEN** the label and the disclaimer are in Russian
