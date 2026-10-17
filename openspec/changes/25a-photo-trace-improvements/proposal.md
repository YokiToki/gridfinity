# Proposal

## Why

The photo-to-cutout flow works on clean synthetic sheets, but the owner's real photos of tools on A4 paper (taken on a wooden table) show four weaknesses:

1. **Placing the corners is awkward.** The numbered markers sit on top of the very corners they must be placed on, so the corner cannot be seen, and only the small marker can be grabbed.
2. **Shadows become part of the tool.** Without flash, soft shadows beside the tools are taken as object: on the owner's photo the silhouettes grow by 3–5 mm (the pliers come out 71.75 × 173.25 mm). With flash the opposite happens: the yellow and grey handle parts are as bright as paper, so the pliers fall apart into six pieces, because only brightness is looked at, not colour.
3. **The photo advice is too short** to help a first-time user get a usable photo.
4. **Paper and orientation are on the wrong step.** They matter when the corners are placed, not when a file is chosen.
5. **Corners are always placed by hand,** although the white sheet on a darker table is easy to find automatically.

## What Changes

- **Apple-style corner editor.** Large transparent ring markers (outline only, so the corner stays visible); the corner is grabbed from the area near it inside the sheet, not by the marker itself, and moves with the finger's movement so the finger never covers it; while a corner is moved a magnifier (loupe) shows the area around it enlarged, placed away from the finger.
- **Automatic corners.** When the photo is chosen the app finds the sheet (a bright, unsaturated area on a darker or more colourful table), proposes its four corners, and also proposes the paper size (A4, Letter or custom) and orientation from the sheet's true proportions. The user can correct everything; if the sheet is not found the corners start inset as now with a message.
- **Paper and orientation move to the corner step.** The first step becomes just choosing the photo and moves on by itself once the photo is read; the second step has the corners plus the paper size and orientation, preset from the detection.
- **Shadow-resistant, colour-aware silhouettes.** The straightened sheet keeps its colour. Objects are found by colour difference from the paper as well as by darkness, and a soft neutral darkening of the paper (a shadow) is not an object unless it is dark enough to be part of a tool. This also recovers pale-but-coloured tool parts and avoids the fragmentation seen with flash. A shadow control appears if testing shows it is needed.
- **Shooting guidance.** A detailed list of how to take the photo (contrasting surface, straight from above, from a distance, flash or bright even light, tools apart) on the first step, and a Tips control to reopen it on the later steps.
- **Regression fixtures from the owner's two photos** (downscaled copies, with the owner's consent) so the result on real shadows and flash is checked by tests, not only by eye.

## Capabilities

### New Capabilities

### Modified Capabilities
- `cutout-photo-trace`: paper selection moves to the alignment step with automatic detection of the sheet and paper size; the corner editor is redefined; silhouette detection uses colour and rejects soft shadows.

## Impact

- `features/keychain/decodeImage.ts` (a colour decode next to the grey one), `geometry/photo/` (`homography.ts` colour rectify, `segment.ts` colour and shadow logic, new `detect.ts` for the sheet and `aspect.ts` for proportions), `features/cutout/photo/` (`PhotoDialog` steps, `CornerEditor` rewritten, new `Loupe`), strings in en and ru, tests, a dev dependency `jpeg-js` and two small fixture images for tests.
- Out of scope: lens distortion, separating touching tools, removing shadows by flash-less relighting of the whole photo, interactive brush for manual correction, detecting several sheets, non-rectangular paper.
- Depends on: `25-cutout-photo-trace` (archived).
