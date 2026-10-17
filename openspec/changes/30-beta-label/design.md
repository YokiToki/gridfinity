# Design

## Context

The header shows the logo with the product name (`Header.tsx`), the footer of the start pages holds the support block and the GitHub link (`Footer.tsx`), and strings live under `site.*`.

## Decisions

- **Badge.** A `<button>` styled as a small tag (tokens from `theme.css`, same family as the card tags) reading "beta" after the site name in the header and in the start page title area. It opens a small popover (the `details` pattern already used by the product switcher) with the disclaimer text; it closes on Escape or an outside click. It is visible at 390 px (icon-sized next to the logo when the name is hidden).
- **Disclaimer text** (en/ru under `site.beta`): "PrintKit is in beta. Dimensions, fit and print settings may be wrong. Check the model and test-print a small part before you rely on it. No warranty." The footer repeats the same sentence without the popover.
- **No state.** The label is always shown; nothing is stored.
- **Accessibility.** The badge has an accessible name ("beta, show details") and the popover is a labelled region; the footer text is plain text.

## Risks / Trade-offs

- [The header is already tight at 390 px and in ru] → the badge is icon-sized below `md` and the layout is checked in both languages at 390 and 768 px.
