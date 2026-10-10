# Proposal

## Why

The prototype is a single-purpose baseplate page with ad-hoc CSS and English-only strings. The planned product has three modes (Box, Baseplate, Cutout), shared controls, mm/inch display and en/ru localization. Retrofitting structure and i18n later would touch every component, so they come first.

## What Changes

- Add Tailwind CSS and Tabler Icons (current majors) and replace `style.css` with utility classes.
- Introduce a feature-based component structure: app shell (sidebar, viewport, top bar), reusable form controls (number field with unit, segmented control, toggle, section), per-mode panels.
- Add a mode switcher (Box / Baseplate / Cutout) with routing so each mode has its own URL and persisted state; Box and Cutout show a "coming soon" placeholder until their changes land.
- Add en/ru localization with automatic language detection and a manual selector; all existing strings move into translation files.
- Add a global length-unit setting (mm / inch) that affects every displayed and entered length.
- Move the existing baseplate panel into the new structure without changing its geometry.

## Capabilities

### New Capabilities
- `app-shell`: layout, mode navigation, reusable controls, persisted per-mode state.
- `localization`: en/ru UI language selection and detection.
- `unit-display`: mm/inch display and input of lengths.

### Modified Capabilities

## Impact

- Rewrites `src/App.tsx`, `src/style.css`; adds `src/app/`, `src/features/`, `src/ui/`, `src/i18n/`.
- New dependencies: `tailwindcss`, `@tailwindcss/vite`, `@tabler/icons-react`, `react-router` (or equivalent), an i18n library (`i18next` + `react-i18next`).
- `Viewport.tsx` behavior unchanged.
