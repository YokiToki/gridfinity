# Spec Delta

## Purpose
Defines UI language support so the whole interface is available in English and Russian.

## ADDED Requirements

### Requirement: Supported languages
The app SHALL provide its complete UI in English and Russian, with no user-visible string hard-coded outside the translation files.

#### Scenario: Russian UI
- **WHEN** the language is Russian
- **THEN** all labels, tooltips, placeholders, validation messages and file/menu names are shown in Russian

#### Scenario: Missing translation
- **WHEN** a key is missing in the active language
- **THEN** the English text is shown instead of the raw key

### Requirement: Language selection
The app SHALL pick the initial language from the browser preference (Russian if it is a Russian locale, otherwise English) and SHALL let the user override it manually; the override SHALL persist across reloads.

#### Scenario: Auto-detect
- **WHEN** a first-time visitor's browser language is ru-RU
- **THEN** the UI starts in Russian

#### Scenario: Manual override
- **WHEN** the user selects English in the language selector
- **THEN** the UI switches immediately without reload and stays English after reload

### Requirement: Document language
The app SHALL keep the document `lang` attribute and title in sync with the active language.

#### Scenario: Switch updates document
- **WHEN** the language changes
- **THEN** `<html lang>` reflects the new language
