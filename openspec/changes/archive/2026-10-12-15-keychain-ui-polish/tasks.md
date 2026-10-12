# Tasks

## 1. Numeric steppers

- [x] 1.1 `NumberField`: stepper on by default with `stepper={false}` opt-out; 32 px buttons, clamp/disable at limits, hold-to-repeat (400 ms delay, 10/s), Shift ×10, accessible names. Unit tests with fake timers for click, repeat, limits and Shift.
- [x] 1.2 `LengthField`: step in the display unit, stored value in mm. Test in inches (1 mm step → +0.039 in shown, +1 mm stored).
- [x] 1.3 Update the existing component tests that break (button counts, role queries) and add one test per mode panel proving every numeric input has both buttons. UI task: compare layouts in the browser in en and ru at 380 px (desktop panel) and 390 px (drawer) and fix rows that overflow; no artboard, built from the component library.

## 2. Enlarged mask preview

- [x] 2.1 `MaskPreview`: Enlarge button, large overlay (`role="dialog"`, focus management, Esc and outside click), redraw at large size with scaled labels, live updates. Component tests: open, close by each route, focus return, update while open. No artboard.
- [x] 2.2 en/ru strings (parity test); check the large view on a 390 px screen.

## 3. Editor axes

- [x] 3.1 `PlacementEditor`: rulers inside a margin band, larger labels, heavier grid and axes, strong label colour; panel scroller bottom padding equal to the sticky footer height. Component tests for the SVG structure (label y inside the viewBox with margin, stroke widths ordering) and a layout test with a mocked footer height. No artboard.
- [x] 3.2 Browser check in en and ru: scroll the panel to the end with the editor open; rulers fully visible and readable.

## 4. Verification

- [x] 4.1 `npm test` and `npm run build` are green; no console errors.
- [x] 4.2 In the browser: steppers in Baseplate, Box, Cutout and Keychain panels (including the Export options section), hold-to-repeat, inches, enlarged mask with a many-area image (`v_form.jpeg`), editor axes with the channel mount.
