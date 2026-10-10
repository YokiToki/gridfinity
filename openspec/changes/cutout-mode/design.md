# Design

## Context

Cutout reuses the Box assembly (foot, body, lip, fasteners) with a solid interior. The reference service lists the same sections: Z units, magnets/screws None/Corner/Full, lip style, outer wall and a "Cutouts" list. See proposal.md.

## Goals / Non-Goals

**Goals:** fitted pockets from STL or rectangle; fast placement; robust import.

**Non-Goals:** automatic tool recognition, multi-part imports, STEP/OBJ formats.

## Decisions

- **Shared base:** `geometry/bin.ts` (extracted from box in the first task here if not already) builds the outer shell; Box adds cavity, Cutout leaves it solid and subtracts pockets.
- **STL parsing:** own small parser (binary + ASCII) producing a `Float32Array`/`Uint32Array` mesh, then `new Mesh` → `Manifold.ofMesh` with vertex merge; avoids a heavy dependency.
- **Projected mode:** compute the outline with `Manifold.project()` (cross-section), offset by clearance, extrude to depth. True 3D mode: translate/rotate manifold, offset via minkowski-style by scaling is wrong — use `CrossSection.offset` for projected and for 3D apply clearance as an optional hull-free uniform scale warning; document that 3D mode clearance is approximate.
- **Placement model:** each cutout stores `{x, y, rotation, flipped}` in bin-cavity coordinates; alignment actions are pure functions over bounding boxes (unit-testable).
- **2D top view:** SVG overlay with the bin outline, grid and cutout outlines; drag handled with pointer events and snapping utilities shared with the fastener editor.
- **Persistence:** imported meshes are too large for localStorage → store in IndexedDB keyed by id; params reference the id.

## Risks / Trade-offs

- Very dense STL files slow booleans → decimate preview or warn above a triangle threshold.
- True 3D clearance is approximate → default to projected mode, label 3D mode accordingly.
- IndexedDB unavailable (private mode) → keep the mesh in memory for the session and warn that it won't persist.
