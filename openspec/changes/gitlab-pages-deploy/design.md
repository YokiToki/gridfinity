# Design

## Context

Vite builds to `dist/`; the app has no backend. The WASM file is imported with `?url`, so it gets a hashed path that must respect `base`. See proposal.md.

## Goals / Non-Goals

**Goals:** one small CI file; reproducible build via `npm ci`; correct subpath behavior.

**Non-Goals:** custom domain, preview environments per MR, caching tuning.

## Decisions

- Single `pages` job with a `node:24` image, `npm ci`, `npm test`, `npm run build`, `mv dist public`, artifacts `public`, rules limited to `$CI_DEFAULT_BRANCH`; a separate `verify` job runs tests and build on all other refs.
- Vite `base: './'` (relative) so one build works for any subpath; hash routing avoids server rewrites. Alternative: `base: '/<project>/'` — breaks if the project is renamed.
- Cache `node_modules` keyed on `package-lock.json`.

## Risks / Trade-offs

- Pages serves `.wasm` with a correct MIME type normally; verify after first deploy → fallback is inlining WASM as base64 (+33% size).
- Node version drift → pin the image tag and `engines` in `package.json`.
