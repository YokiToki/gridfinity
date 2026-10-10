# Tasks

## 1. Build for subpath

- [x] 1.1 Set Vite `base: './'`; verify `npm run build` then `npx vite preview` serves the app and WASM from a nested path (e.g. served under `/sub/` by a static server) with the model rendering.

## 2. Workflow

- [ ] 2.1 Add `.github/workflows/pages.yml` with `verify` (every push and PR: test + build) and `deploy` (main only, via `actions/deploy-pages`); check the YAML parses and the first run shows both jobs.
- [ ] 2.2 Add `engines.node` and README "Deploy" section describing enabling Pages; verify a workflow run on the real remote publishes the site and a deep link opens (user action: push + set Pages source to GitHub Actions).
