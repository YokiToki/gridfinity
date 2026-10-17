# Tasks

## 1. Name, config and README

- [ ] 1.1 Get from the owner, before coding: the TRC20 address, the Metrika counter number and its tag snippet, the repository URL after the rename, the source of the rack dimension drawing. If something is missing, stop and ask; do not invent values.
- [ ] 1.2 `app/site.ts` with `GITHUB_URL`, `DONATION_ADDRESS`, `METRIKA_ID`; name changes: `app.title` = "PrintKit" (not translated, both languages), `index.html` title, `package.json` name `printkit`; `CLAUDE.md` project description and a note that storage keys keep the `gridfinity.*` prefix. Tests: the address matches the TRON format (34 base58 characters starting with `T`), the counter id is a positive integer, `document.title` is "PrintKit" in en and ru (extend the existing Header test).
- [ ] 1.3 Rewrite `README.md` as a general introduction (pitch, products and modes, Why this exists with the motivation text, quick start, commands, deployment including the repository-rename checklist, how it works, project layout, References, License). References include every source listed in the design, each with what was taken from it; check each link resolves (open them) and fix or drop dead ones. Verify by reading the rendered README on GitHub's preview of the file and by the link check noted in the commit.

## 2. Header, motivation, footer

- [ ] 2.1 GitHub link in `Header` (icon-only, new tab, `noopener noreferrer`, localized `aria-label`, 40 px target); en and ru strings (parity test). Component tests: link present on start pages and in a mode, correct `href`, `target` and `rel`. Verify in the browser at 1280, 768 and 390 px that no header control is pushed out of view. No artboard: built from existing header controls and tokens, said in the commit.
- [ ] 2.2 `Motivation` block on the root start page only (en and ru), under the cards; the owner approves the Russian wording. Component test: shown on `/`, absent on `/gridfinity`, `/keychain` and in modes; language switch changes the text. Verify it is visible without scrolling at 1280 × 800 and readable at 390 px.
- [ ] 2.3 `Footer` on the start pages: donation line with the address (wrapping `<code>`), Copy button (clipboard with selection fallback and a short confirmation), the Analytics link and a text link to GitHub. Tests: copy writes the address to a stubbed clipboard, the fallback keeps the address selectable when the clipboard rejects, the footer is not rendered in a mode, key parity en/ru.

## 3. Analytics

- [ ] 3.1 `app/analytics.ts`: consent store (`gridfinity.analytics`: `granted | denied | unset`, storage failures treated as unset), `enableAnalytics()` (injects the Metrika tag with `trackHash`, replay and click map off, link tracking off, accurate bounce on) and `disableAnalytics()` (disable flag, removes `_ym_*` cookies). Tests with a stubbed `document` and `localStorage`: nothing is injected before consent, Accept injects exactly one script with the configured id and options, Decline injects nothing and is remembered, withdrawing after Accept sets the disable flag, storage errors do not throw.
- [ ] 3.2 `ConsentBanner`: non-modal bottom bar, Accept and Decline of equal size and style, one sentence on what is collected, shown until a choice is stored, reopened from the footer link; en and ru strings. Component tests: first visit shows it and makes no request, Accept loads analytics and hides it, Decline hides it and keeps analytics off, reload keeps the choice, the footer link reopens the choice, the banner does not hide the footer's copy button at 390 px.
- [ ] 3.3 No user content in statistics: a test walks the route table and asserts no route path or hash carries a query or parameter value, and a note in the design is kept in sync. Verify in the browser's network panel: with consent unset or declined no request goes to the analytics host; after Accept the tag loads and a route change sends a hit; photos and parameters never appear in the requests.

## 4. Verification

- [ ] 4.1 `npm test` and `npm run build` are green, the dev server starts, the console has no errors.
- [ ] 4.2 In the browser, en and ru, desktop and 390 px: tab title is PrintKit, header link works, the motivation text and footer look right on the root page and the footer on a product chooser, copy works, the banner flow behaves as in the scenarios, and the README renders correctly on GitHub.
