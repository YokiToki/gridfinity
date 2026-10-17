# Design

## Context

The app title comes from `app.title` in i18n (set in `syncDocument`) and `index.html` has `<title>Gridfinity</title>`. The header (`app/Header.tsx`) holds the logo, the product and mode switchers, the units and language switchers. The start pages share `StartLayout`. Settings live in `localStorage` under `gridfinity.*` keys. The site is deployed to GitHub Pages with a custom domain; `base` is relative and routes are hash routes, so renaming the repository does not affect paths.

## Goals / Non-Goals

**Goals:**
- One consistent name and an honest README for the whole set of tools.
- Motivation, source link and donation address present but unobtrusive; tools stay uncluttered.
- Analytics that cannot run before consent and cannot see user content.

**Non-Goals:**
- Renaming the site address, migrating stored keys, a privacy page (the repository is already renamed).

## Decisions

- **Name and keys.** The name is a display name (i18n `app.title` = "PrintKit", not translated; `index.html` title, `package.json` `name: "printkit"`, README). The `gridfinity.*` storage keys stay: renaming them would silently reset every visitor's settings, language and last session, for no visible gain. `CLAUDE.md` says so next to the persistence convention.
- **One config module** `app/site.ts` exports `GITHUB_URL`, `DONATION_ADDRESS` and `METRIKA_ID`. `GITHUB_URL` is `https://github.com/YokiToki/printkit`, `DONATION_ADDRESS` is the owner's TRON address, `METRIKA_ID` is 113657472. A test validates the address with the full Base58Check rule (decodes to 25 bytes, first byte `0x41`, last four bytes are the double SHA-256 checksum of the first 21), so a typo cannot ship, and that the counter id is a positive integer.
- **Header link.** An icon-only `<a>` (Tabler GitHub icon) after the language switcher, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label` from i18n; on narrow widths it keeps its 40 px target and the product label shrinks first (the header already hides labels below `lg`). Alternative: a link in the footer only. Rejected: tools have no footer and the request is for the header.
- **Motivation and footer on start pages only.** `StartLayout` renders the motivation block under the cards on the root page only (a `motivation` prop used by `StartPage`) and the footer on all start pages (root and product choosers). Workspaces keep their full height for the viewport. The footer has the donation line (label, address in a `<code>` that wraps, Copy button using `navigator.clipboard` with a selection fallback), an "Analytics" link that reopens the consent choice, and the GitHub link as a text link too.
- **Consent store.** `app/analytics.ts` keeps `gridfinity.analytics` = `granted | denied | unset` in `localStorage` (try/catch, unset when storage fails: then the banner shows each visit and nothing is stored).
- **Loading the counter with `react-yandex-metrika`.** A small `AnalyticsHost` component, mounted once at the app root outside the router (the package's README requires the initializer not to be remounted), renders nothing until consent is `granted`; then it `React.lazy`-imports the package's `YMInitializer` and renders `<YMInitializer accounts={[METRIKA_ID]} version="2" options={{ webvisor: false, clickmap: false, trackLinks: false, accurateTrackBounce: true, trackHash: true, defer: true }} />`. `version="2"` selects the current `tag.js` loader (the default `1` loads the old `watch.js`). `trackHash` makes hash routes page views. Withdrawal: the package has no off switch, so `disableAnalytics()` sets the counter's own disable flag (`window['disableYaCounter113657472'] = true`, documented by Yandex), removes `_ym_*` cookies and the banner stays hidden; the script already loaded in this tab stops counting, and a reload loads nothing. Alternatives: injecting the tag by hand (no dependency, but the owner pointed at the package and it is a thin wrapper), a bundled static snippet in `index.html` (loads before consent, rejected). Risk and fallback: the package was last released in 2022 and uses class components and `prop-types`; the first analytics task checks that it mounts under React 19 and that `npm audit` shows nothing for it; if either fails, `AnalyticsHost` injects the same tag with the same options by hand and the package is dropped, with no change to the behaviour or the specs.
- **What is never sent.** Photos and files never leave the page (no code path touches the analytics call), and parameter values are not in the URL (routes are paths only), so the hash URL Metrika reports contains only the route. A test asserts that no route in the app carries a query or a parameter in its hash, so adding one later fails loudly.
- **Banner.** A non-modal bottom bar over the page, role `region` with an accessible name, two buttons of the same size and style (Accept, Decline) and one sentence on what is collected; Esc does nothing (no implied choice); it does not cover the footer's copy button on small screens (it pushes content with padding). Shown once, until a choice is stored.
- **README.** Structure: title and one-line pitch; the products (with the modes of each); "Why this exists" containing the motivation text; quick start; commands; deployment (Pages, custom domain, repository rename checklist: rename, `git remote set-url`, Pages keeps the custom domain, update `GITHUB_URL`); how it works (the geometry kernel diagram stays, generalised); project layout; References; License. The old baseplate-only text is replaced; screenshots are not added.
- **References** (each with a one-line "what we took from it"): gridfinitygenerator.com (modes and parameter set), pandagao.github.io/gridfinity-studio (3MF export and Bambu presets), tooltrace.ai and aiprintgen.ru/gridfinity-generator (photo-to-organiser flow), the Kiwiworks blank-panel generator (rack panel patterns and options) and spuder's mini-rack generator (enclosure options) on MakerWorld, the IKEA Skadis board layout (pattern), the 10-inch rack dimension drawing on Wikimedia Commons, `File:19_inch_vs_10_inch_correct_rack_dimensions.svg` (standard dimensions; linked, not copied), `iancanderson/openscad-agent` (agent-driven OpenSCAD workflow that inspired the spec-driven development here), and the Gridfinity standard by Zack Freedman. Links are checked in the task.

## Risks / Trade-offs

- [Analytics under EU rules] → opt-in banner, replay off, no content sent; a visitor who declines is never tracked.
- [Metrika blocked by adblockers or by networks] → nothing in the app depends on it.
- [An unmaintained wrapper package] → loaded lazily after consent only, checked under React 19 and with `npm audit`, with a hand-written loader as the documented fallback.
- [A wrong donation address loses money] → format test, the owner confirms the address in the review of this task, and the address is a single constant.
- [Header gets crowded at 390 px] → verified in the browser; the GitHub icon is the lowest priority item and may move into the language switcher's row if needed.
- [README links rot] → checked once in the task; no automation.

## Open Questions

- The exact wording of the motivation text in Russian is for the owner to approve in review; the meaning is fixed by the spec.
