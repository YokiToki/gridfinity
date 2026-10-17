# Proposal

## Why

The site started as a Gridfinity baseplate generator and is now a set of parametric tools for 3D printing: Gridfinity bins, baseplates and cutouts, keychains, and soon rack parts. The name, the README and the page title still say "Gridfinity" and describe only a baseplate generator. The owner also wants visitors to know why the tools are free, to find the source and to be able to say thanks, and wants to know how the site is used.

## What Changes

- **Name: PrintKit.** The page title, the logo text on the start page, `package.json` and the README use "PrintKit"; the three products keep their names (Gridfinity Master, Keychain Master, Rack Master). The repository has been renamed `printkit` by the owner (`https://github.com/YokiToki/printkit`); the site address stays as it is. Stored browser data keeps its `gridfinity.*` keys so nobody loses their settings.
- **README rewritten** as a general introduction: what PrintKit is, the products and modes, how to run it, how it works, deployment, the motivation text and an extended References section.
- **References** gain the sources from the planning documents: the photo-to-organiser tools (tooltrace.ai, aiprintgen.ru), the two MakerWorld rack generators, the IKEA Skadis board layout, the rack dimension drawing, and `iancanderson/openscad-agent`, next to the two Gridfinity generators already listed.
- **Motivation block** on the root start page and in the README: Gridfinity is an open standard and its tools should be free; the other tools are what the author makes and uses for themselves and shares.
- **GitHub link** in the header.
- **Donation address** (USDT on TRON, TRC20) in a footer on the start pages, with a copy button.
- **Yandex Metrika** analytics (counter 113657472, through the `react-metrika` package) behind a consent banner: nothing is loaded or stored until the visitor presses Accept; the choice is remembered and can be changed from the footer. Session replay and click maps are off, and no user content (photos, parameters, files) is ever sent.

## Capabilities

### New Capabilities
- `site-identity`: the site's name, motivation text, links, donation address and analytics consent.

### Modified Capabilities

## Impact

- `index.html`, `package.json`, `README.md`, `CLAUDE.md` (description and the paragraph on storage keys), `i18n` (`app.title`, the new strings in en and ru), `app/Header.tsx`, `app/StartPage.tsx`/`StartLayout.tsx`, new `app/Footer.tsx`, `app/Motivation.tsx`, `app/ConsentBanner.tsx`, `app/analytics.ts`, `app/site.ts` (links, address, counter id), tests.
- Values supplied by the owner and recorded in `app/site.ts`: donation address `TBjti2PPTiKg7BbnEKGYhWNjZLMBypfe8h` (TRON, the checksum has been verified), Metrika counter `113657472`, repository `https://github.com/YokiToki/printkit`, and the source of the rack dimension drawing, <https://commons.wikimedia.org/wiki/File:19_inch_vs_10_inch_correct_rack_dimensions.svg>, which goes into References as a link (the file itself is not added to the repository).
- New dependency: `react-metrika` (MIT, 1.2.0, released September 2026, ships TypeScript types, about 32 KB, no peer dependencies), imported lazily so its code is not even downloaded before consent.
- Out of scope: renaming the repository or the site address, a privacy-policy page beyond the short text in the banner, other analytics, translating the README to Russian, a custom logo, changing the stored data keys.
- Depends on: `21-collapsed-sections-previews`, `22-keychain-art-paw` (start page). It deliberately leaves the "Start page" requirement in `app-shell` untouched (changes 26 and later modify it), and states its page content in its own capability.
