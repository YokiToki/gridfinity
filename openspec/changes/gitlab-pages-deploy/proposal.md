# Proposal

## Why

The app is a static client-only site; publishing it on GitLab Pages gives a stable personal URL with no server to run.

## What Changes

- Add `.gitlab-ci.yml` that installs, tests, builds and publishes `dist/` as the `pages` artifact from the default branch.
- Configure Vite `base` so assets and the WASM file resolve under the project subpath.
- Make WASM and routing work when served from a subpath (hash routing, relative asset URLs).
- Document the deploy in the README.

## Capabilities

### New Capabilities
- `site-deployment`: automated static build and publishing of the app.

### Modified Capabilities

## Impact

- New `.gitlab-ci.yml`, `vite.config.ts` change, README section.
- Requires a GitLab remote and Pages enabled for the project (user action).
