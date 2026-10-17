# Proposal

## Why

Parts such as the keystone mounts, the rack enclosures and the photo cutouts are new and not tuned on many real prints and devices. A visitor should not assume that every dimension is right. The site needs to say plainly that it is in beta and that something may be wrong.

## What Changes

- **Beta label.** A small "beta" badge next to the site name in the top bar and on the start page, in both languages, in the same style as the existing tags.
- **Disclaimer.** A short text, reachable from the badge and shown in the page footer: the generators are in beta, dimensions and fit may be wrong, check the model and test-print a small part before relying on it, and the author gives no warranty.
- **Scope.** It applies to the whole site (it is one label for the project, not a per-feature mark). Per-feature marks can follow later if the user wants them.

## Capabilities

### New Capabilities

### Modified Capabilities
- `app-shell`: a beta label and disclaimer on the site.

## Impact

- `app/Header.tsx` (badge, an explanation popover), `app/Footer.tsx` (the disclaimer paragraph), `app/site.ts` if a text constant is useful, strings in en and ru, tests.
- Out of scope: per-feature badges, a first-visit modal or consent step, analytics events for the label.
- Depends on: `22a-printkit-branding`.
