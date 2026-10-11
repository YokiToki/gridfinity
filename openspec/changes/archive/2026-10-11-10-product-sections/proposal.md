# Proposal

## Why

The site is growing beyond Gridfinity: a second tool, **Keychain Master** (relief keychains from an image), is planned. The app shell today assumes one product with three modes (Box, Baseplate, Cutout). The site must split into two sections, **Gridfinity Master** and **Keychain Master**, so each product has its own routes, navigation, start card and persisted state, and more products can be added later without touching the existing ones.

## What Changes

- Two product sections: Gridfinity Master (existing Box, Baseplate, Cutout) and Keychain Master (a placeholder until `11-keychain-relief`).
- Routes become `/gridfinity/{box,baseplate,cutout}` and `/keychain`; the old `/box`, `/baseplate`, `/cutout` redirect to the new paths so existing links keep working.
- The root start page becomes a product chooser (two cards); Gridfinity gets its own mode chooser at `/gridfinity` (the current start page content).
- The top bar gets a product switcher; the mode switcher is shown only inside Gridfinity Master. The logo/title shows the active product name. Units and language stay global.
- "Continue" chip on the start page remembers the product as well as the mode.
- A product registry (`products.ts`) so a section is declared in one place: id, path, icon, modes, name/description i18n keys.
- Persistence keys are unchanged (`gridfinity.*`); Keychain gets its own `keychain.*` namespace.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: product sections, product-aware navigation, start page and redirects.

## Impact

- `src/app/routes.tsx`, `modes.tsx` (+ new `products.ts`), `Header`, `StartPage`, `lastSession`, `ModeArt`, `AppShell`; new `features/keychain/KeychainMode` placeholder; en/ru strings.
- Geometry and the worker are untouched here.
- Out of scope: any keychain functionality (see 11–13), visual redesign of the start page beyond adding the product cards (no artboard exists for the chooser; built from the component library), server-side routing or deep-link SEO.
- Depends on: `01-app-foundation`.
