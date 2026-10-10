# Design

## Context

Vite builds to `dist/`; the app has no backend. The WASM file is imported with `?url`, so it gets a hashed path that must respect `base`. See proposal.md.

## Goals / Non-Goals

**Goals:** one small CI file; reproducible build via `npm ci`; correct subpath behavior.

**Non-Goals:** custom domain, preview environments per MR, caching tuning.

## Decisions

- One workflow, two jobs. `verify` runs on every push and pull request: `npm ci`, `npm test`, `npm run build`; on `main` it also uploads `dist/` with `actions/upload-pages-artifact`. `deploy` needs `verify`, runs only on `main` and uses `actions/deploy-pages` with `pages: write` and `id-token: write`. Failing tests therefore block publishing.
- Vite `base: './'` (relative) so one build works for any subpath; hash routing avoids server rewrites. Alternative: `base: '/<repo>/'` — breaks if the repository is renamed.
- npm cache through `actions/setup-node` (`cache: npm`), keyed on `package-lock.json`.

## Risks / Trade-offs

- Pages serves `.wasm` with a correct MIME type normally; verify after first deploy → fallback is inlining WASM as base64 (+33% size).
- Node version drift → pin `node-version` in the workflow and `engines` in `package.json`.
