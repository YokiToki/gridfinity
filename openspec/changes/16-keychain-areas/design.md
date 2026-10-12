# Design

## Context

`buildSilhouette` labels the background components of the closed mask, calls the enclosed ones holes (ids by scan order of the first pixel, stable), fills all except `keepOpen`, then continues (specks, grow). `MaskPreview` marks pixels 1 solid, 2 open hole, 3 filled hole and draws the numbers. The heightfield has no notion of regions.

## Decisions

- **Params:** `SilhouetteParams.areas: Record<number, { mode: 'follow' | 'open' | 'level'; level: number }>` replaces `keepOpen`; missing ids mean `follow`. `fillHoles: false` stays as "all areas open". Ids that disappear are ignored silently (as `keepOpen` did).
- **Mask pipeline:** after closing, `findHoles` returns ids and labels. `follow` and `level` areas are filled in the mask (material), `open` stay background. The silhouette result additionally returns an `areaLabel` plane (Int16, 0 = none, else id) at image resolution for the filled areas, resampled to the grid together with the mask (nearest label) so the heightfield knows which node belongs to which area.
- **Heightfield:** in `buildGrid`, nodes whose label has `mode: 'level'` get `top = base + max(level, heightFloor)` and skip detail lines and patterns; every other node is computed as today. The distance transform still runs on the full filled mask (areas do not create rims, the step at the area border is hard). The EDT of nodes next to a levelled area is unchanged.
- **Preview:** the preview data gets a fourth plane value for the selected area; hit testing maps a click on the canvas to the preview pixel and reads the area id from a stored label plane (`MaskPreview.labels`, Uint8/Uint16, same size as `data`). Areas smaller than 2 preview pixels are still selectable from the list.
- **UI:** `SilhouetteSection` lists areas (`Area 3 · 1250 px`) with a mode `Select` (Follow relief / Open / Level) and a `LengthField` for the level when Level is chosen; selection highlights the row and the outline on the preview; "Apply to all" sets all rows. Labels on the mask are numbers only (no word) to stay readable.
- **Migration:** `keepOpen: [3]` becomes `areas: { 3: { mode: 'open', level: 0.6 } }`; old records without either get `areas: {}`.
- **Reference check:** with all areas `follow` or `open` the output must equal change 11's (regression volumes).

## Risks / Trade-offs

- Area ids shift if the threshold or closing changes enough to merge/split regions: the stored per-area settings may then point to the wrong region. Mitigation: settings keyed by id are shown with the area size, and a warning appears when an id with settings no longer exists.
- A levelled area inside a heavily patterned relief creates a visible flat patch by design; this is documented in the hint under the level field.
