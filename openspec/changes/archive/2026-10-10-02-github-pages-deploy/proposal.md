# Proposal

## Why

The app is a static client-only site; publishing it on GitHub Pages gives a stable personal URL with no server to run.

## What Changes

- Add a GitHub Actions workflow (`.github/workflows/pages.yml`) that installs, tests, builds and, from `main`, publishes `dist/` to GitHub Pages.
- Configure Vite `base` so assets and the WASM file resolve under the project subpath.
- Make WASM and routing work when served from a subpath (hash routing, relative asset URLs).
- Document the deploy in the README.

## Capabilities

### New Capabilities
- `site-deployment`: automated static build and publishing of the app.

### Modified Capabilities

## Impact

- New `.github/workflows/pages.yml`, `vite.config.ts` change, README section.
- Requires Pages enabled in the repository settings with source "GitHub Actions" (user action).
