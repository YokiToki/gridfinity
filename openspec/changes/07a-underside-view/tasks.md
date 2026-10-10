# Tasks

## 1. Camera and visibility

- [ ] 1.1 Add `groundOpacity(cameraZ, targetZ, distance)` in `features/viewport/ground.ts` with a smooth ramp and unit tests: 1 above, 0 below, monotonic, symmetric ramp width, exactly on the plane.
- [ ] 1.2 Lift the polar limit in `Viewport.tsx` (`maxPolarAngle = π`), make the gizmo `view()` safe for ±Z, and keep the Z-up behaviour; check in the browser that the camera passes below the plane without rolling and that the −Z gizmo end shows the underside.
- [ ] 1.3 Fade the grid (`uAlpha` uniform) and the build plate overlay by `groundOpacity`, hiding them at zero; browser check: orbit through the plane with the build plate on, the grid and plate fade out and return.

## 2. Lighting

- [ ] 2.1 Add the lower directional light and brighten the hemisphere ground colour; browser check with a bin with Full magnets: the pockets read as recesses from below, and the top still looks the same.

## 3. Verification

- [ ] 3.1 `npm test` and `npm run build` pass; in the browser on Baseplate and Box: top, side and bottom views, no console errors, no flipping near the poles, grid and plate hidden below.
