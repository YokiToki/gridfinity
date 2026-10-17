# Tasks

## 1. Label and disclaimer

- [ ] 1.1 Beta badge with the disclaimer popover in the header, the disclaimer line in the footer, en and ru strings under `site.beta`. Component tests: the badge is on every route, selecting it shows the text, Escape and an outside click close it, the footer has the same text, key parity, the badge keeps an accessible name.

## 2. Verification

- [ ] 2.1 `npm test` and `npm run build` are green, no console errors.
- [ ] 2.2 In the browser, en and ru, at 390 and 768 px and desktop: the badge fits next to the logo on the start page, a product page and a mode page, the popover is readable, the footer shows the disclaimer.
