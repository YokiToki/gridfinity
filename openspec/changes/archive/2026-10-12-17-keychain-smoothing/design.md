# Design

## Context

`buildGrid` samples the brightness plane by area-averaging the image into the grid (`resampleGray`) and maps it through contrast/gamma to a height. The surface is then given detail lines and patterns. Heights are stored in a `Float32Array` over the grid with a mask of material nodes.

## Decisions

- **Two places, two meanings.** *Source smoothing* acts on the brightness plane (values 0..1) before `brightnessValue`; it is what removes photo grain. *Surface smoothing* acts on the finished heights `h` (relief height above the plate) after the profile/source and before spine, groove, patterns, text and area levels.
- **Filter:** separable Gaussian with σ = radius / cell (clamped to ≥ 0.5 cell to have an effect, ≤ 40 cells for cost), kernel radius 3σ. Masked normalisation: only material nodes contribute and the weights are renormalised, so values do not bleed in from outside the silhouette or from levelled areas (nodes flagged as fixed are skipped and not averaged in).
- **Despeckle:** 3 × 3 median over material neighbours before the blur; off by default.
- **Floor and rim:** after smoothing `h = max(h, heightFloor)`; the rim ceiling used for the brightness source (bevel profile) is applied after smoothing so the rim shape is not softened away.
- **Defaults and compatibility:** `SourceParams.smooth` default 0.4 mm and `despeckle` false apply when the brightness source is chosen in the UI; the stored default for records saved before this change is 0, so existing keychains do not change. `ReliefParams.smooth` default 0. With all zeros the output is byte-identical to before (regression volumes).
- **UI:** in `ProfileSection`: for the brightness source "Smoothing" (`LengthField` with steppers, 0–3 mm) and a "Remove speckles" toggle; in the relief group "Smooth surface" (`LengthField`, 0 = off) with a hint that crisp features (patterns, text, levels) are applied after it. A warning shows when the radius is below one grid cell ("no effect at this resolution") with the raise-resolution action reused from patterns.
- **Cost:** a separable blur is O(n·σ); with the 400k triangle budget (≈ 100k nodes) this is a few milliseconds.

## Risks / Trade-offs

- Heavy surface smoothing flattens thin features and fine terraces: documented in the hint; the silhouette is unaffected.
- A blur radius larger than the narrowest feature reduces its height; the minimum height clamp keeps the model valid.
