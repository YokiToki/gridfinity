# Tasks

## 1. Tooling

- [ ] 1.1 Install Tailwind CSS v4 + `@tailwindcss/vite`, `@tabler/icons-react`, `react-router`, `i18next`, `react-i18next`, `i18next-browser-languagedetector`; verify `npm run build` passes and a Tailwind class renders in `npm run dev`.
- [ ] 1.2 Create `theme.css` tokens and remove `style.css`; verify the existing baseplate screen looks equivalent (screenshot compare in dev server).

## 2. Structure and shell

- [ ] 2.1 Create folders `app/`, `ui/`, `features/{box,baseplate,cutout,viewport}/`, `geometry/`, `i18n/`; move `baseplate.ts`/`stl.ts` to `geometry/` and `Viewport.tsx` to `features/viewport/`; `npm test` and `npm run build` still pass.
- [ ] 2.2 Implement `AppShell` (top bar, sidebar slot, viewport slot) and hash router with Box/Baseplate/Cutout routes; verify direct URL open and switching in the browser.
- [ ] 2.3 Build `StartPage` (three mode cards with Tabler icons and localized descriptions; no viewport mounted); link the top-bar logo to it, fall back to it for unknown paths; component test: each card links to its route, and the page does not render the viewport.
- [ ] 2.4 Add placeholder panels for Box and Cutout; verify the viewport still renders under them.
- [ ] 2.5 Implement `usePersistedState` with corruption fallback; unit test: valid, missing and corrupt JSON.

## 3. Shared controls

- [ ] 3.1 Build `Section`, `Toggle`, `SegmentedControl`, `NumberField` in `ui/` with keyboard support; component tests for clamping and keyboard operation.
- [ ] 3.2 Port the baseplate panel to these controls without geometry changes; existing geometry tests unchanged and green.

## 4. Localization

- [ ] 4.1 Add i18n provider, `en.json`, `ru.json`, language selector in the top bar, `<html lang>` sync; test: switching language changes a label and survives reload.
- [ ] 4.2 Move every existing UI string into translation files; test that `ru.json` has every `en.json` key.

## 5. Units

- [ ] 5.1 Implement `UnitContext` and `LengthField`; unit tests for mm↔inch conversion and 2 in → 50.8 mm.
- [ ] 5.2 Add the mm/inch toggle and the measurements readout (X/Y/Z) to the shell; verify round-trip mm→inch→mm leaves exported STL byte-identical.
- [ ] 5.3 Document the structure and conventions in `CLAUDE.md`.
