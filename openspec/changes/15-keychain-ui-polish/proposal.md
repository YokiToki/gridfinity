# Proposal

## Why

Three small usability gaps found while using Keychain Master, one of them app-wide:

1. Numeric fields have no +/− buttons in most places (`NumberField` has an opt-in `stepper` that nothing uses), so values can only be typed or nudged with arrow keys.
2. The silhouette mask preview is a small fixed card in the viewport corner; holes and thin features are hard to see and to tell apart.
3. In the placement editor the axis rulers sit at the very bottom/left edge of the drawing: the sticky export block of the panel partly covers them and the thin grey lines and tiny labels are hard to read.

## What Changes

- **Steppers everywhere:** every numeric field (`NumberField`, therefore `LengthField`) shows − and + buttons by default, in all modes (Gridfinity and Keychain). The step stays the field's `step`; buttons respect min/max (disabled at the limit), work in the display unit (inches), repeat while held, and Shift multiplies the step by 10. A field can opt out only where a stepper is meaningless.
- **Enlarged mask preview:** an "Enlarge" button on the preview opens a large view (about 70 % of the viewport, centred) with the same mask, larger area labels and a close button (Esc and click outside also close it). The small card stays as it is.
- **Editor axes:** rulers move inside the drawing with a margin, so nothing sits on the bottom/left edge; labels are larger and the axis and grid lines heavier (axes through the origin clearly stronger than the grid). The panel gets bottom padding equal to the sticky footer so scrolled content is never hidden by it.

## Capabilities

### New Capabilities
- `numeric-fields`: behaviour of numeric input fields (stepper buttons, limits, repeat, units).

### Modified Capabilities
- `keychain-image`: enlarged mask preview.
- `keychain-mounts`: placement editor axes legibility.

## Impact

- `ui/NumberField.tsx` (+ `LengthField`), `features/keychain/MaskPreview.tsx`, `PlacementEditor.tsx`, `app/Workspace.tsx` (panel bottom padding), en/ru strings, component tests; existing tests that count buttons or query by role may need updating.
- Out of scope: sliders, a different numeric input widget, touch gestures beyond the buttons, zoom/pan of the enlarged mask (it is a fit-to-view image), changing step values of individual fields.
- Depends on: `13-keychain-mounts` (archived).
