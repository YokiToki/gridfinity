# Design

## Context

`buildKeychainParts` builds the top half T (z ≥ 0, flat back at z = 0), the bottom half B = `T.mirror(z).rotate(180° about X)` and moves it right by `gap` plus a y alignment, and loose pins standing at the sheet. The parts reach the viewport as `ModelResult.parts` with labels `top`, `bottom`, `pinN`. The viewport already moves parts in the scene only (exploded gap for baseplates).

## Decisions

- **Transforms, not geometry.** The worker returns, next to the parts, `assembly: { [label]: Mat4 }` (column-major 4×4): identity for `top`; for `bottom` the inverse of its sheet placement composed with the 180° rotation back about X, so that it ends up below the mating plane (z ≤ 0) as the mirror image of the top half; for each pin the translation that puts it in its hole at the pin position, centred on the mating plane (z from −L/2 to +L/2). Matrices are computed from the same numbers used to build the sheet, so they cannot drift.
- **Viewport:** `Viewport` takes `view: 'sheet' | 'assembled'`, `openGap` and the matrices; applying a matrix means setting `group.matrix` with `matrixAutoUpdate = false`; the opening gap adds ±gap/2 along Z to the top and bottom groups (pins stay at the plane). Labels are hidden in the assembled view. The camera is not refitted on mode switch (the user keeps their angle), but a `Fit` press fits the current layout.
- **Overlays:** the baseplate exploded gap code path is generalised to `applyLayout(parts, view)`; part labels, oversize colouring and the build plate overlay stay for the sheet view only (the plate overlay hides in the assembled view).
- **UI:** a segmented control Print sheet | Assembled in the viewport toolbar (shown only when `ModelResult.assembly` exists) and a slider/`NumberField` with steppers for the gap; preference key `gridfinity.viewport` gets `keychainView` and `openGap`.
- **Consistency check:** a unit test composes the assembly matrices with the sheet placement and verifies that the transformed bottom half equals the mirror of the top half across z = 0 within 1e-6 and that pin axes coincide with the hole axes.

## Risks / Trade-offs

- Normals of the mirrored half: the mesh is a proper rotation of a valid mirrored solid, so it renders correctly; the test checks signed volume stays positive after the transform.
- Z-fighting at the mating plane when the gap is 0: the halves touch exactly; a tiny polygon offset on the bottom half avoids flicker and is only visual.
