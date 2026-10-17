# Spec Delta

## Purpose
Defines how the site presents itself: its name, the motivation text, outbound links, the donation address and the analytics consent.

## ADDED Requirements

### Requirement: Site name
The site SHALL present itself as PrintKit: the browser tab title and the root start page SHALL use that name, while the products keep their own names. The name SHALL be the same in every language.

#### Scenario: Title
- **WHEN** any page is open, in English or in Russian
- **THEN** the tab title is "PrintKit"

#### Scenario: Products unchanged
- **WHEN** the root start page is shown
- **THEN** the product cards are still named by their products, not by the site name

### Requirement: Motivation
The root start page SHALL show a short motivation text stating that Gridfinity is an open standard and that tools for it should be free, and that the other tools are made by the author for their own use and shared. The same text SHALL be in the README. It SHALL be localized.

#### Scenario: Shown on the root page
- **WHEN** the root start page is opened
- **THEN** the motivation text is visible without scrolling on a desktop screen and readable on a phone

#### Scenario: Language
- **WHEN** the language is switched to Russian
- **THEN** the motivation text is shown in Russian

#### Scenario: Not on workspaces
- **WHEN** a tool (a mode with a viewport) is open
- **THEN** the motivation text is not shown, so it does not take room from the tool

### Requirement: Source link
The header SHALL contain a link to the project's GitHub repository that opens in a new tab, with an accessible name, on every page.

#### Scenario: Link
- **WHEN** the user looks at the header on the start page or in any mode
- **THEN** a GitHub link is present and opens the repository in a new tab without giving the new page access to the opener

#### Scenario: Narrow screens
- **WHEN** the screen is 390 px wide
- **THEN** the link is still reachable and does not push other header controls out of view

### Requirement: Donation address
The start pages SHALL show a footer with a donation address on the TRON network (TRC20) and a button that copies the address. The footer SHALL say what the address is for and that donations are optional.

#### Scenario: Copy
- **WHEN** the user presses the copy button
- **THEN** the address is placed on the clipboard and a short confirmation is shown

#### Scenario: No clipboard access
- **WHEN** copying is not permitted by the browser
- **THEN** the address stays visible and selectable so it can be copied by hand

#### Scenario: Not in tools
- **WHEN** a tool is open
- **THEN** the footer is not shown

### Requirement: Analytics consent
The site SHALL use Yandex Metrika for visit statistics only after the visitor consents. A consent banner SHALL be shown on the first visit with Accept and Decline of equal prominence and a short statement of what is collected. Until Accept is pressed, the analytics script SHALL NOT be loaded and no analytics cookie or request SHALL be made. The choice SHALL be remembered and SHALL be changeable from the footer. Session replay and click maps SHALL be off, and the statistics SHALL NOT contain photos, files, parameter values or anything else the visitor enters.

#### Scenario: First visit
- **WHEN** a visitor opens the site for the first time
- **THEN** the banner is shown and no request to the analytics host is made

#### Scenario: Accept
- **WHEN** the visitor presses Accept
- **THEN** the banner closes, the analytics script is loaded and later page views are counted

#### Scenario: Decline
- **WHEN** the visitor presses Decline
- **THEN** the banner closes, nothing is loaded, and the banner does not return on later visits

#### Scenario: Change of mind
- **WHEN** the visitor uses the analytics link in the footer
- **THEN** they can accept or decline again, and a withdrawn consent stops counting in the same session

#### Scenario: Photos and parameters
- **WHEN** the visitor uses the photo tool or edits parameters
- **THEN** no photo, file or parameter value is sent to the analytics host

#### Scenario: Remembered choice
- **WHEN** the visitor has accepted and returns
- **THEN** the banner is not shown and counting resumes
