# Design

## Context

The prototype has one `App.tsx`, global CSS and a `Viewport` that already works. Later changes add three modes, many parameters and two languages, so structure must exist before more UI lands. See proposal.md.

## Goals / Non-Goals

**Goals:**
- Feature-folder structure where a mode owns its panel, params type, defaults and persistence key.
- One source of truth for lengths in mm; unit conversion only at the UI boundary.
- i18n wired through every component from the first commit.

**Non-Goals:**
- No geometry changes; no new generator behavior.
- No server-side routing or SSR.

## Decisions

- **Layout:** `src/app/` (shell, router, providers), `src/ui/` (generic controls, no domain knowledge), `src/features/{box,baseplate,cutout}/` (panel + params + defaults), `src/features/viewport/`, `src/i18n/`, `src/geometry/` (React-free). Alternative: flat `components/` — rejected, it blurs domain vs generic controls.
- **Tailwind v4 via `@tailwindcss/vite`** with design tokens as CSS variables in one `theme.css`; dark theme only for now.
- **Icons:** `@tabler/icons-react`, imported per icon for tree-shaking.
- **Routing:** `react-router` with `createHashRouter` — hash routes work on GitLab Pages without rewrite rules. Alternative: path routes + 404.html copy; more fragile.
- **i18n:** `i18next` + `react-i18next` with `en.json`/`ru.json`, English fallback, `LanguageDetector` for first visit, choice stored in localStorage. Keys grouped by feature (`baseplate.magnets.full`). A unit test fails if `ru.json` lacks any key from `en.json`.
- **Units:** `UnitContext` exposes `unit`, `toDisplay(mm)`, `fromDisplay(value)`, `label`. `LengthField` is the only component that converts. Inches display with 3 decimals; mm with up to 2.
- **State:** a small `usePersistedState(key, defaults, version)` hook that merges stored JSON over defaults and tolerates corruption; one key per mode.

## Risks / Trade-offs

- Hash routes look less clean → acceptable for a personal static site.
- Rounding when typing inches (e.g. 1.6 in → 40.64 mm) → keep the raw typed value while the field has focus and convert on commit.
- Moving files churns git history → do the move in one commit with no behavior change.
