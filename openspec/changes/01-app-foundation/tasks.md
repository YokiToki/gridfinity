# Tasks

## 1. Tooling

- [ ] 1.1 Install Tailwind CSS v4 + `@tailwindcss/vite`, `@tabler/icons-react`, `react-router`, `i18next`, `react-i18next`, `i18next-browser-languagedetector`; verify `npm run build` passes and a Tailwind class renders in `npm run dev`.
- [ ] 1.2 Create `theme.css` from `design/theme.reference.css` (Tailwind v4 `@theme`) and self-host Manrope, Unbounded, JetBrains Mono via `@fontsource-variable/*`, remove `style.css`; verify the app renders with the design tokens and no request goes to Google Fonts. Design: `design/artboards/Tokens.dc.html` (see `design/README.md`). 

## 2. Structure and shell

- [ ] 2.1 Create folders `app/`, `ui/`, `features/{box,baseplate,cutout,viewport}/`, `geometry/`, `i18n/`; move `baseplate.ts`/`stl.ts` to `geometry/` and `Viewport.tsx` to `features/viewport/`; `npm test` and `npm run build` still pass.
- [ ] 2.2 Implement `AppShell` (top bar, sidebar slot, viewport slot) and hash router with Box/Baseplate/Cutout routes; verify direct URL open and switching in the browser. Design: `design/artboards/Baseplate.dc.html`, `design/artboards/ViewportStyle.dc.html`. Header 52 px, panel 380 px, sticky export block at the panel bottom, status bar with X/Y/Z, viewport styling per ViewportStyle.
- [ ] 2.3 Build `StartPage` (three mode cards with Tabler icons and localized descriptions; no viewport mounted); link the top-bar logo to it, fall back to it for unknown paths; component test: each card links to its route, and the page does not render the viewport. Design: `design/artboards/Main.dc.html`. Include the "Continue: <mode> <size>, saved <time>" pill (from persisted state; hidden when none) and 1/2/3 keyboard shortcuts on the cards.
- [ ] 2.4 Add placeholder panels for Box and Cutout; verify the viewport still renders under them.
- [ ] 2.5 Implement the mobile layout below 768 px: mode dropdown in the header, parameters in a bottom drawer (drag handle, collapse), compact units/language; verify at 390 px in the browser. Design: `design/artboards/Mobile.dc.html`.
- [ ] 2.6 Implement `usePersistedState` with corruption fallback; unit test: valid, missing and corrupt JSON.

## 3. Shared controls

- [ ] 3.1 Build `Section`, `Toggle`, `SegmentedControl`, `NumberField` in `ui/` with keyboard support; component tests for clamping and keyboard operation. Design: `design/artboards/Components.dc.html`. Match all states shown (default, focus, error, disabled); add `Banner` (info/warn/error with icon) and the stepper variant of `NumberField`.
- [ ] 3.2 Port the baseplate panel to these controls without geometry changes; existing geometry tests unchanged and green. Design: `design/artboards/Baseplate.dc.html`.

## 4. Localization

- [ ] 4.1 Add i18n provider, `en.json`, `ru.json`, language selector in the top bar, `<html lang>` sync; test: switching language changes a label and survives reload. Design: `design/artboards/BaseplateRU.dc.html`. Verify no truncation in the ru layout.
- [ ] 4.2 Move every existing UI string into translation files; test that `ru.json` has every `en.json` key.

## 5. Units

- [ ] 5.1 Implement `UnitContext` and `LengthField`; unit tests for mm↔inch conversion and 2 in → 50.8 mm.
- [ ] 5.2 Add the mm/inch toggle and the measurements readout (X/Y/Z) to the shell; verify round-trip mm→inch→mm leaves exported STL byte-identical.
- [ ] 5.3 Document the structure and conventions in `CLAUDE.md`.
