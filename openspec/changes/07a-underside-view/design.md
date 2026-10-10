# Design

## Context

`Viewport.tsx` uses three.js `OrbitControls` with `maxPolarAngle = 0.499π`, which stops the camera just above the horizon. The ground grid is a large shader plane at `z = −0.02` that fades with distance; the build plate overlay is a translucent plane plus an outline at `z ≈ −0.04`. Lights are a hemisphere light (sky white, ground bluish) and one directional light above. See proposal.md.

## Goals / Non-Goals

**Goals:** free orbit under the model with a stable Z-up view; no grid or plate covering the underside; readable bottom faces.

**Non-Goals:** a trackball without a fixed up axis, section planes, x-ray.

## Decisions

- **Orbit limits:** `OrbitControls` keeps a fixed up vector, so rotating past the poles is clamped, not flipped. Set `maxPolarAngle = π` (and keep `minPolarAngle = 0`): the camera can reach the exact top and bottom without rolling. Alternative: `TrackballControls` — rejected, the horizon drifts and the up axis is lost.
- **Ground visibility:** a pure helper `groundOpacity(cameraZ, targetZ)` returns 1 above the plane and 0 below, with a short smooth ramp (about ±8 % of the camera distance around the plane) so crossing does not pop. The animation loop sets the grid shader's `uAlpha` uniform and the plate material and outline opacity from it each frame; objects at opacity 0 are set `visible = false`. The helper lives in its own module so it is unit-tested without WebGL.
- **Grid shader:** gains a `uAlpha` uniform multiplying the output alpha; `discard` when the final alpha is under 0.01.
- **Build plate overlay:** its fill and outline use the same opacity (fill: 0.85 × factor).
- **Underside light:** a second directional light below (`position.z < 0`, intensity about 0.9) and a brighter ground colour on the hemisphere light, so down-facing faces get light without washing out the top. Both stay in the scene regardless of the camera.
- **Distance limits:** `minDistance`/`maxDistance` unchanged; the target stays at the model centre.
- **Gizmo:** the existing hit sprites already call `view(dir)`; with the polar limit lifted, the `−Z` sprite works. The `view()` helper keeps the up vector to avoid a degenerate lookAt at the poles (offset the direction by a tiny amount for exact ±Z).

## Risks / Trade-offs

- Exactly vertical views can make `lookAt` unstable → use a tiny epsilon in the direction for ±Z.
- The model has no ground to stand on from below: dark background plus the lower light is enough; no extra floor is drawn.
