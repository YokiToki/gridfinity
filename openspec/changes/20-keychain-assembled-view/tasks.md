# Tasks

## 1. Assembly data

- [ ] 1.1 `buildKeychainParts` returns assembly matrices for `top`, `bottom` and each pin; `ModelResult.assembly` (optional, worker-transferable plain arrays). Geometry test: transformed bottom equals the mirror of the top across z = 0 (1e-6), signed volume positive, pin axes coincide with hole axes, closed halves touch exactly.
- [ ] 1.2 Opening gap composition (pure helper) with tests: ±gap/2 on the halves, pins fixed at the plane.

## 2. Viewport and UI

- [ ] 2.1 `Viewport` layout switch (`view`, `openGap`, matrices; labels and plate overlay hidden in the assembled view; Fit uses the current layout). Component test with the viewport mocked plus a unit test of the layout helper. Verify in the browser.
- [ ] 2.2 Toolbar controls in `Workspace` (segmented Print sheet | Assembled, gap `NumberField` with steppers; shown only with `assembly`), persisted in `gridfinity.viewport`; en/ru strings (parity). No artboard: build from the existing toolbar buttons and `ui/` components.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` are green; no console errors.
- [ ] 3.2 In the browser with `v_form.jpeg`, 3 pins and a channel: Assembled shows one keychain, pins in the holes, the channel open at the edge; gap 6 mm shows the inside; switching does not trigger regeneration (network/worker tab); export identical in both views.
