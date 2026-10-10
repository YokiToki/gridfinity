# Design

## Context

Box needs the bin foot (reverse of the baseplate socket), walls, lip and cavity. See proposal.md. The profile builders come from `geometry-core`.

## Goals / Non-Goals

**Goals:** good fit on real Gridfinity baseplates; fast regeneration; fractional footprints.

**Non-Goals:** label tabs, finger slots, lid generation, per-compartment heights.

## Decisions

- **Assembly order:** outer shell = foot instances (full cells) ∪ body (outer footprint, from foot top to height) ; subtract cavity (shell inset by wall, floor above foot); union dividers; add lip; subtract scoop; subtract fasteners. One final union/subtract pass.
- **Cavity vs lip:** with Default/Thin lip the cavity follows the lip's inner profile, so the lip is part of the outer shell, not a separate add-on.
- **Padding area:** foot only under full cells; padding region gets a flat floor at foot top so non-multiple bins are still stable.
- **Scoop:** a fillet body per enabled side built from a swept quarter-circle profile and unioned into the cavity floor.
- **Compartments:** model as a split list along each axis (`dividersX[], dividersY[]`) plus a merge set; the 2D editor edits this model. Equal division is a generator for the list.
- **Height:** stored in mm; "units" is an input convenience (×7 mm).

## Risks / Trade-offs

- Thin/Default lip profiles must match baseplate sockets within clearance → add a cross-section test that fits foot into socket with the same clearance values.
- Many compartments × scoop → cost; scoop applies per outer side only (not per compartment) in this change.
