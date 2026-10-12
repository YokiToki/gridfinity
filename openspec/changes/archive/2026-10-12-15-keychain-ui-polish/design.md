# Design

## Context

`NumberField` already has a `stepper` prop (− / + buttons inside the field, 30 px wide) and arrow-key stepping, but it is off by default and no caller enables it. `LengthField` wraps it and converts mm ↔ display unit. `MaskPreview` is an absolutely positioned card (`w-44 md:w-52`) drawing the 256 px preview onto a canvas. The `PlacementEditor` draws rulers inside its SVG at `vb.y + vb.h − 1` and `vb.x + 1` (the very edge) with 0.1 stroke grid lines.

## Decisions

- **Default stepper.** `stepper` becomes opt-out (`stepper={false}`); the buttons are 32 px wide (meets the 32 px target rule), with `aria-label` "Decrease/Increase: <label>" (the keys `common.decrease/increase` already exist). Existing tests that query the field by label keep working.
- **Behaviour:** click = ±step; hold = repeat after 400 ms at 10/s; Shift = ×10; value is clamped and rounded to `digits`; at min/max the corresponding button is disabled. In inches `step` is the already converted step from `LengthField`.
- **Layout:** two-column rows (`grid-cols-2`) get narrower inputs; check the narrowest panel (380 px) and the Russian labels, shrink digits width or hide the buttons below a container width of 150 px only if a field truly does not fit (decided in the UI task, noted in the commit).
- **Enlarged mask:** a `Dialog`-like overlay inside the viewport section (not a browser modal): role `dialog`, labelled, focus moved to the close button and restored on close, Esc closes. The canvas is redrawn from the same preview data at the larger size with `image-rendering: pixelated`; area labels scale with the canvas. No new data is requested from the worker.
- **Axes:** rulers are drawn in a margin band inside the viewBox (margin = 1.2 × font size), label font size ≈ step / 3 with a floor, grid stroke 0.15, axes 0.5, origin cross 0.6, labels in the strong text colour. The editor wrapper gets `pb` so the drawing's bottom edge clears the sticky footer; the panel scroller itself gets padding-bottom equal to the footer height (measured with a `ResizeObserver`).

## Risks / Trade-offs

- Adding buttons to ~100 fields changes layouts in tight rows; mitigated by the 380 px / 390 px checks in both languages.
- Hold-to-repeat can trigger many model rebuilds; the existing debounce in `useModel` absorbs it.
