# Proposal

## Why

In two-halves mode the viewport shows the print sheet: the halves side by side, the bottom one rotated to lie face down, with loose pins. That is right for printing but you cannot see the finished keychain, check how the channel meets the ring, how the pins sit, or judge the look. A way to view the halves put together is needed.

## What Changes

- **View mode** in the viewport toolbar when two halves are on: **Print sheet** (current) and **Assembled**.
- **Assembled** puts the bottom half back against the top half at the mating plane (rotated 180° back about X), inserts the loose pins into their holes, and shows the whole keychain as it will look glued; the mounting channel and ring hole are visible at the edge.
- **Open gap** slider (0–15 mm, 0 = closed) separates the halves along the vertical axis to inspect pins, holes and the channel; default 0.
- The view change is instant: no geometry is regenerated, the viewport only moves the existing meshes. The export is unaffected (it always exports the print sheet).
- The choice is remembered with the viewport preferences.

## Capabilities

### New Capabilities
- `keychain-assembled-view`: the assembled view of two halves in the viewport.

### Modified Capabilities

## Impact

- `geometry/keychain.ts` (assembly transforms in the result), `ModelResult` (optional `assembly`), `features/viewport/Viewport.tsx` (apply transforms), `app/Workspace.tsx` toolbar button group, `keychain.*` strings, tests.
- Out of scope: animating the closing of the halves, section/clipping view, exploded views for other modes, assembled export (3MF assemblies), showing the ring.
- Depends on: `13-keychain-mounts` (archived). Blocks nothing and is blocked by nothing else, so it can be taken at any point after 13.
