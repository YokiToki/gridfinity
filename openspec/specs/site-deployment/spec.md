# site-deployment Specification

## Purpose
Defines how the app is built, verified and published as a static site on GitHub Pages.

## Requirements

### Requirement: Automated publishing
A push to the `main` branch SHALL run tests and a production build and, if both pass, publish the build output to GitHub Pages.

#### Scenario: Successful workflow
- **WHEN** a commit lands on the `main` branch and tests and build pass
- **THEN** the site is published and reachable at the project's Pages URL

#### Scenario: Failing tests
- **WHEN** tests fail on the `main` branch
- **THEN** nothing is published and the workflow is marked failed

### Requirement: Works under a subpath
The published site SHALL load all assets, including the geometry WASM binary, and navigate between modes correctly when served from the project subpath.

#### Scenario: Deep link
- **WHEN** a user opens the Pages URL with a mode hash route
- **THEN** that mode loads and the model generates

### Requirement: Branch workflows do not publish
Pipelines for non-`main` branches SHALL run tests and build but SHALL NOT publish.

#### Scenario: Feature branch or pull request
- **WHEN** a commit is pushed to a feature branch
- **THEN** tests and build run and no Pages deployment occurs
