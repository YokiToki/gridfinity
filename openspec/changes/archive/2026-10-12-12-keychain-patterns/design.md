# Design

## Context

`11-keychain-relief` builds the surface from a heightfield `h(x, y)` on a grid inside the silhouette (distance profile + base). Patterns fit this model well: they are scalar fields over the same grid, so they compose by addition/clamping with no extra booleans. The reference skill warns that blurred noise and large sine waves were rejected; "more detail" worked better as a sharper spine line and a deeper groove. Patterns here follow that: crisp masks with flat bottoms.

## Goals / Non-Goals

**Goals:** a small set of pure, testable pattern functions; photo-capable brightness source; identical output to 11 when everything is off.
**Non-Goals:** noise textures, user textures, per-region patterns, text.

## Decisions

- **Pipeline order** in `heightfield()`: source (distance | brightness) → profile preset → detail lines → pattern (scoped) → clamp to `[heightFloor, hmax_total]` → `+ baseLayer`. Each stage is a pure function over typed arrays and is tested separately.
- **Brightness source:** grayscale downsampled to the grid, `v = clamp(gamma(contrast(g)))`, `h = heightFloor + v * (hmax − heightFloor)`; the distance bevel still applies near the rim (`min(h, rimProfile)`) so edges stay printable. Gray values are kept as an extra `Uint8` plane in the worker message (11 only sends the mask); the message type gains an optional `gray`.
- **Preset → parameters:** presets are data (`{profile: 'bevel'|'dome'|'terrace'|'flat'|'engraved', steps, pow, …}`) and the UI derives "Custom" by comparing against the preset table; no hidden state.
- **Profile functions:** Bevel `t^pow` (11); Dome `sin(t·π/2)`-style easing with zero end slope; Terraced `floor(t·n)/n` (hard steps, optional 0.2 mm riser chamfer deferred); Flat `t>0 ? 1 : 0` with the rim floor; Engraved subtracts from the plate inside the silhouette.
- **Pattern fields** are in keychain-local coordinates (origin at the silhouette bbox centre), so they do not shift when the image or size changes aspect. Each returns `0..1` coverage via crisp comparisons (`frac(u/pitch) < width/pitch`), multiplied by `depth`.
  - Lines: `u = x·cosθ + y·sinθ`. Crosshatch: lines at θ and θ+90°. Dots: distance to nearest lattice point < r (square or staggered). Hex: distance to hex-lattice cell edges < width/2. Ripples: `u = hypot(x, y)`.
- **Anti-aliasing / stair-steps:** grid sampling makes pattern edges jagged at low resolution; treat as a quality issue (resolution warning), not something to blur away.
- **Budget/quality coupling:** the 11 budget logic returns `effectiveCell`; the UI warns when `pitch < 4 · effectiveCell`. A "raise resolution" button sets quality to the highest value that still fits the budget for the current size.
- **UI:** `PatternSection` with a thumbnail row (small canvas drawings of each pattern), `ProfileSection` extension for presets and height source; build from `ui/` components, no artboard exists.

## Implementation notes

- **No extra gray plane in the message:** the worker already holds the whole image (`imageRegistry` from 11), so the brightness source resamples `img.gray` over the same crop as the mask; the message type is unchanged.
- **Plate patterns:** with scope "Base plate only" the plate is part of the heightfield grid (its outline is rasterised to the grid, so round plates have cell-sized steps); for every other case the plate stays an extruded `CrossSection` unioned with the relief, which keeps the default output identical to `11`. Engraved uses a plate ring (plate outline minus silhouette) in the union path.
- **Spine/groove units:** spine height, width, groove depth, width and distance from the rim are millimetres (the reference script used fractions of hmax and a drawn detail mask); the groove follows the edge band, not engraved line art.
- **Photos:** the brightness source works on any image; for a photo set the threshold to 255 so the whole picture is the silhouette. The "looks like a photo" hint is hidden for the brightness source.

## Verification (task 4.2)

Browser, `v_form.jpeg` (70 mm, defaults of 11): defaults after migrating an old stored record give 2180.6 mm³ and a 70 × 59.08 × 4 mm box, identical to the result of change 11. Lines 45° (pitch 1.5, width 0.5, depth 0.3): 2114.4 mm³, same box. Dots staggered (2 / 1 / 0.4): 2133 mm³. Terraced 3 steps, bevel 12 mm: 2072.7 mm³, height 3.333 (levels 2/3 and 4/3 of 2 mm, the emblem never reaches the plateau). Engraved into a round plate (2.5 mm, auto margin): 97.6 × 97.6 × 2.5 mm, 18058 mm³. A generated shaded sphere as a "photo" with the brightness source, 70 × 46.67 × 3.5 mm, 107k triangles. All exports read back as closed solids with min z = 0.

## Risks / Trade-offs

- Fine patterns on big plates need many cells → budget hits quickly; mitigated by the warning and by scope limits.
- Brightness relief on photos can create very steep slopes → gamma/contrast defaults chosen conservatively plus a max-slope note in the UI.
- Terraced and Engraved change printability (overhangs on risers are vertical, fine; engraving is open to the top, fine) — no supports needed in either.
