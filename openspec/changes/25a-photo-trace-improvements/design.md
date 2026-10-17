# Design

## Context

The archived change `25-cutout-photo-trace` built the pipeline on a grey image: `decodeImage` returns a `GrayImage`, `rectify` warps it, `segment` fits a quadratic paper surface to the brightness and calls a pixel an object when it is darker than the surface by a sensitivity-dependent fraction. The corner editor draws numbered markers on the corners, and the paper step comes first.

Evidence from the owner's photos (A4 portrait on a wooden table, pliers, cutters and a screwdriver; `tmp/photo_cutout_with_flash.jpeg` and `tmp/photo_cutout_without_flash.jpeg`, 960 × 1280), run through the current pipeline with hand-placed corners:
- **No flash:** 3 silhouettes, but each inflated by the soft shadows on the left and below; the pliers measure 71.75 × 173.25 mm, which is several millimetres more than the tool.
- **Flash:** 6 pieces; the yellow and grey handle parts have almost paper brightness, and the pliers split. A grey-only method cannot find them, while colour finds them easily.
- The sheet is bright and nearly colourless, the table is brown and saturated: an automatic sheet finder has a strong signal.

## Goals / Non-Goals

**Goals:**
- Corners that are comfortable on a phone and a mouse and need no precision hand-placement when the sheet is found.
- Silhouettes from both photos that agree: the same three tools, whole, with sizes that differ by at most 3 mm between the flash and the no-flash photo.
- Everything stays client-side, pure and testable; real photos are in the tests as small fixtures.

**Non-Goals:**
- Lens distortion, interactive correction brush, several sheets, touching-tool separation.

## Decisions

### Colour pipeline

- **`ColorImage { width, height, rgb: Uint8Array }`** (interleaved) with `decodeColorImage` next to `decodeImage` in `decodeImage.ts`, sharing the backend and the 4096-pixel limit; `toGrayImage` stays for display. `Rectified` gains an optional `rgb` plane set and `rectify` warps colour with the same sampling. The grey path stays, so the existing synthetic grey tests and any caller without colour keep working (no colour → brightness only).
- **Paper surface per channel.** The exclusion mask of objects is still decided from brightness (as now), then a quadratic surface is fitted to each of R, G, B over the paper pixels. `n_c = c / surface_c` is the pixel in "paper units": 1 on paper under any lighting level.

### Object versus shadow

- **Two features per pixel.** Darkness `d = 1 − mean(n_c)`; colour deviation `κ = max_c |n_c − mean(n)|` (how far the colour is from "paper colour scaled by a factor", the family a shadow lives in: a shadow multiplies all channels by nearly the same factor, a coloured tool does not).
- **Rule.** A pixel is an object when `κ > κ0` and `d > 0.03` (a coloured part, whatever its brightness), or `d > D` where `D = max(dropFor(sensitivity), Dshadow)` (darker than the strongest soft shadow, so black and dark-grey parts, including a tool's own contact shadow, are objects). Defaults `κ0 = 0.10`, `Dshadow = 0.50`; shadows on white paper are bluish, so `κ0` is above the usual 0.06 of a shadow. The earlier sensitivity keeps its meaning for the brightness part. Alternatives: grayscale only with a stronger threshold (shrinks black tools' shadow but loses the bright yellow parts and mid-grey steel), HSV saturation only (misses black and grey). The family-of-scaled-paper-colour test is the standard illumination-invariant idea (shadow = multiplicative change).
- **Known weak spot and the plan for it.** Neutral mid-grey tool parts (steel jaws) are brightness-wise like a deep shadow. The first answer is the default `Dshadow` and the user-visible control below; if the two photos show the steel head of the pliers cut away, the fallback is edge-aware recovery: accept neutral candidate pixels (`d` between the sensitivity drop and `Dshadow`) only when they are enclosed by or adjoin confident object pixels across a strong brightness gradient (shadows are soft, steel edges are crisp), using a marker-controlled watershed on the gradient magnitude with confident objects and clearly-paper pixels as markers. The task decides by measurement.
- **Control.** If tuning shows one default cannot serve both photos, the silhouette step gets a "Shadows" slider (how dark a neutral area must be to count as part of a tool), stored with the other photo settings. If it can, no control is added.
- **Cleanup unchanged:** close, specks, fill holes, edge margin, components. With colour the pliers' two handles are joined through the coloured jaw area; remaining gaps are closed by `close`.

### Experiment outcome (task 1.4)

The depth-threshold rule above (`Dshadow = 0.5`) failed on the owner's no-flash photo: the real penumbra is wide (up to 28 mm) and deep (brightness drop up to 0.68), close to the darkness of dark tool parts (0.68 against 0.85–0.94 for the black grip and the dark-green handle), so a threshold on darkness cannot split them; its warm tint comes from the coloured tools nearby. The tool/shadow contact edge is also *less* steep (0.07 per mm) than the penumbra's own slope (0.11 per mm), so no single steepness threshold works either. What was kept and what replaced it:

- **Kept:** per-channel paper surface, the colour deviation `κ` (coloured parts are objects whatever their brightness), the brightness drop of the sensitivity for neutral dark parts. This alone fixes the flash photo (three whole tools).
- **Replaced:** the shadow is removed as a *region grown from clean paper*, `shadowRegion`: starting from pixels that are paper (drop under 0.1, deviation under 0.08), it spreads to neighbours that (a) are not on a "wall", (b) get no brighter than the pixel they were reached from (a shadow darkens toward the object, a lighter tool part behind a darker shadow is not reachable), (c) are nearly colourless (`κ ≤ 0.12`) and (d) are not darker than a drop of 0.8 (black tool parts are not shadow). Walls are sharp edges and thin dark lines at a fine scale (σ 0.3 mm, steepness above `shadowEdge` = 0.3 per mm, grown by one pixel): the penumbra never reaches that steepness, tool edges and the dark line between the jaws of the pliers do. The candidate mask minus this region is the object mask; the existing hole filling then restores enclosed steel parts (the grey head of the pliers has the same colour as the shadow and is only recognisable by its outline, which closes around it).
- **Tried and rejected:** a morphological opening of 1 mm to remove thin shadow strips (it fragmented thin tool parts), a coarse (σ 0.75 mm) steepness limit (the penumbra is steeper than the contact edge), the depth threshold alone.
- **Result at the defaults (`shadowEdge` 0.3, no opening, minimum silhouette area 60 mm² to drop shadow remnants):** both photos give exactly three silhouettes; the flash and no-flash sizes agree within about 0.5 mm in width and height (pliers 62.8 × 173.8 and 63.3 × 173.5 mm, cutters 79.0 × 129.0 and 79.5 × 128.3, screwdriver 33.3 × 192.0 and 32.5 × 191.5) and the areas within 6 %.
- **Control:** none is added. One default serves both photos; `shadowEdge` stays a parameter of `segment` (0 turns the removal off) for a later control if real use needs one.
- **Known limit:** neutral grey tool parts that are the same colour as the shadow and are *not* enclosed by a visible outline can still be taken as shadow; the shooting guidance recommends flash for the cleanest result.
- **Cost:** a recomputation at A4 takes about 0.65–0.8 s in the test runner (six blurs at three channels dominate); the task checks it in the browser and trims if needed.

### Fixtures and acceptance

- **Fixtures.** Downscaled copies (480 × 640 JPEG, about 60 KB each) of the two photos plus their hand-picked corners are committed under `geometry/photo/fixtures/`; `jpeg-js` (MIT, pure JS) becomes a dev dependency so vitest can decode them without a canvas. The repository is public; the photos show only tools on paper, and the owner is asked to confirm before they are committed (if declined, the same checks run as a browser procedure from `tmp/`).
- **Acceptance on both photos at default settings:** (a) exactly three silhouettes, no splits and no merges; (b) the bounding sizes of the pliers, the cutters and the screwdriver agree between the flash and the no-flash photo within 3 mm in each direction and the areas within 6 %; (c) the no-flash pliers are no longer than 1.5 mm over the flash pliers; (d) auto-detected corners within 1.5 % of the photo diagonal of the hand-picked ones.

### Sheet detection (`geometry/photo/detect.ts`)

1. Work on a copy reduced to about 480 px on the long side.
2. Paper score: bright and nearly colourless relative to the photo: `V` above its Otsu level and `S` below 0.25 (relative to the photo's own median saturation, so a warm cast does not defeat it); blur 1 px.
3. Largest connected component after closing; fill holes (tools lie on the sheet), so the area is the full sheet.
4. Quadrilateral: convex hull; if it has more than four vertices, take the four hull vertices that span the largest area (hulls are small, so an exhaustive search is cheap); refine each corner by fitting a line to the component's boundary pixels along each side (least squares with one trimming pass for outliers) and intersecting neighbouring lines for sub-pixel corners.
5. Order the corners clockwise from the top left (smallest x + y), scale to photo pixels, and verify: area at least 15 % of the photo, `checkQuad` ok, plausible proportions. Result `{ corners, confidence }` or `null`.
6. **Proportions** (`aspect.ts`): the true width-to-height ratio of a rectangle seen in perspective from four points with the principal point at the photo centre (Zhang–He two-view-free formula), with a fallback to the mean edge ratio when the focal length cannot be recovered. Matching: within 3 % of A4 (1.414) or Letter (1.294) preselects that preset, otherwise Custom with the measured size, and orientation follows whether the width is below the height.

### Corner editor

- **Rings.** `CornerEditor` draws each corner as a 2 px accent ring of 22 screen pixels radius (constant on screen at any photo size, computed from the rendered size) with no fill and no number; the quad outline is 2 px; the accessible names ("Corner 1: top left") stay.
- **Grab zone.** On pointer down inside the quad or up to 24 screen px outside it, pick the nearest corner if it lies within `max(56 px, 18 % of the shorter quad side)`; otherwise ignore the press. The corner is moved by the pointer's displacement since the press (relative motion), not placed under the pointer, so it is never covered. Pointer capture on the svg handles drags that leave it.
- **Loupe.** A 120 px round `Loupe` shows a 4× view from the full-resolution source around the active corner with a crosshair at the corner and the quad edges; it is placed in the editor corner farthest from the active corner (top-left or bottom-right, switching when the corner nears it), so the pointer never covers it. It shows during pointer drag and while a corner has keyboard focus and arrows are used.
- **Order and clamp.** A corner cannot be dragged across the opposite one (clamped to leave the quad convex), so the order cannot flip while dragging; the warnings for pasted or keyboard-forced bad states stay.

### Shooting guidance

A `PhotoTips` list (strings `cutout.photo.tips.*`, en and ru): (1) plain white sheet, flat; (2) on a contrasting surface, dark or coloured, not white, so the sheet is easy to find; (3) tools apart from each other and from the paper's edge, nothing touching; (4) camera straight above and parallel to the table, whole sheet in frame; (5) from a distance with some zoom rather than close up (less perspective and less apparent growth of tall tools); (6) flash or bright even light, no strong light from the side (soft shadows are handled but a flash gives the cleanest result); (7) dark or coloured tools work best, white and chrome parts on white paper may be missed. It is shown on step 1 beside the Choose button and as a "Tips" button on steps 2 and 3 that opens it in a small popover (Esc closes, focus returns), so the user can reopen it without leaving the step.

### Dialog flow

- Step 1 becomes just "Choose photo"; when the photo is read, the dialog goes to step 2 automatically (Back returns). Step 2 holds the corners editor, the paper size and orientation controls (moved as they are) and the straightened preview; the preset and orientation are preselected from detection and shown as "Detected: A4 portrait" with a note when they were changed by the user. Step 3 is unchanged apart from the shadow control if needed.

## Risks / Trade-offs

- [Neutral mid-grey tool parts treated as shadow] → measured on the two photos; edge-aware recovery is the documented fallback; the shadow control as a user escape.
- [Sheet detection fails on a white table or a patterned cloth] → clear message, inset corners as before; the manual editor is now more comfortable anyway.
- [Letter versus A4 mix-up from the aspect estimate] → 3 % window, shown as an editable proposal.
- [Larger working data: three channels] → the straightened sheet is about 3 MB RGB, all steps stay linear; measured in the task (target under 600 ms per recomputation at A4).
- [A third-party dev dependency] → test-only, pure JS, MIT.

## Open Questions

- Whether the shadow control is needed is decided by the experiment task; the specs do not depend on it.
