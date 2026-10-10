# Tasks

## 1. Build for subpath

- [ ] 1.1 Set Vite `base: './'`; verify `npm run build` then `npx vite preview` serves the app and WASM from a nested path (e.g. served under `/sub/` by a static server) with the model rendering.

## 2. Pipeline

- [ ] 2.1 Add `.gitlab-ci.yml` with `verify` (all branches) and `pages` (default branch only); validate with the GitLab CI Lint (`glab ci lint` or the web editor).
- [ ] 2.2 Add `engines.node` and README "Deploy" section describing enabling Pages; verify a pipeline run on the real remote publishes the site and a deep link opens (user action: push + enable Pages).
