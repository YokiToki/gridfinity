# Proposal

## Why

A common use of Gridfinity is a bin that holds a specific tool in a fitted pocket. Cutout mode generates a solid block (bin) with one or more negative shapes — from an imported STL or a built-in primitive — positioned conveniently.

## What Changes

- New Cutout mode: bin footprint/height (fractional units), lip style, outer wall thickness, magnets/screws via shared settings.
- Cutouts list ("Add"): each cutout is either an imported STL or a primitive (rectangle with corner radius; circle/rounded slot as follow-ups noted but optional), with depth, clearance and finger-notch option.
- STL import (binary and ASCII), unit selection (mm/inch), orientation by flat face (lay flat), automatic projection of the 3D shape to its footprint for pocket cutting or true 3D subtraction.
- Placement: drag in a 2D top view, numeric X/Y/rotation, snap to grid, centre horizontally/vertically in the bin, align to edges, auto-fit footprint to contents.
- Per-cutout clearance (offset), depth and corner rounding.

## Capabilities

### New Capabilities
- `cutout-model`: bin with cutouts, depth and clearance handling.
- `cutout-import`: STL import and primitive shapes as cutout sources.
- `cutout-placement`: positioning, centring and rotation of cutouts.

### Modified Capabilities

## Impact

- New `geometry/cutout.ts`, `geometry/stl-import.ts`, `features/cutout/*`; replaces the Cutout placeholder.
- Reuses the Box geometry (foot, body, lip); depends on `07-box-mode`, `04-fastener-placement`.
