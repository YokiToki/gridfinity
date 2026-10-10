# Proposal

## Why

The base relief from `11-keychain-relief` is one profile: a bevelled plateau. Keychains look better, and print differently, with other relief styles: rounded or stepped profiles, engraved lines, hatching, dots, and heights driven by the picture's own brightness. The agent pipeline only had one hand-tuned style (plateau + spine + groove) and a recorded lesson: smooth waves and blurred noise looked bad and were rejected. Patterns here are therefore crisp, geometric and strictly opt-in.

## What Changes

- **Height source:** Silhouette distance (default, from 11) or Image brightness (lithophane-like relief inside the silhouette; photos are now supported for that source, with contrast and gamma controls).
- **Profile presets:** Bevel (default), Dome (rounded), Terraced (N steps), Flat (extruded), Inverse (engraved into the plate); each preset maps to the profile parameters of 11 and stays editable.
- **Detail lines:** spine ridge and engraved groove ported from the reference (`spine_amp`, `spine_sigma`, `groove`, `groove_blur`).
- **Surface patterns** applied on top of the relief, masked by the silhouette: Lines (angle, pitch, width), Crosshatch, Dots (grid or staggered), Hex, Ripples (concentric from the centre); each with depth and a clamp so the result never goes below the minimum height or through the plate.
- **Pattern scope:** whole relief, only the plateau, or only the base plate.
- Live preview of pattern controls with sensible presets; a "Reset to plain" action.

## Capabilities

### New Capabilities
- `relief-patterns`: height sources, profile presets, detail lines and surface patterns.

### Modified Capabilities

## Impact

- New `geometry/patterns/*` pure functions `(x, y, mask, params) → Δh` composed in the heightfield step of `geometry/keychain.ts`; `features/keychain/PatternSection` and a small pattern thumbnail component; en/ru strings; mesh budget logic from 11 reused (patterns need finer cells, so the effective-resolution notice matters more).
- Out of scope: user-drawn or image-based custom textures, noise/Perlin patterns, per-region patterns, colour/multi-material, text engraving (separate change if wanted).
- Depends on: `11-keychain-relief`.
