# Changelog

All notable changes to ComfyUI Workflow Graph Organizer are documented here.
Entries use the Keep a Changelog categories and semantic product versions.

## [Unreleased]

### Changed

- No unreleased product behavior is published from this branch.

## [1.0.1] - 2026-08-27

### Fixed

- Uses the current non-interactive Comfy Registry publication action while
  preserving the exact reviewed checkout.
- Publishes the first installable Comfy Registry version after the `1.0.0`
  GitHub-only release was blocked by an obsolete comfy-cli option.

The scoped npm package remains unpublished; npm publication is outside this
release.

## [1.0.0] - 2026-08-27

### Added

- Establishes the independently maintained Workflow Graph Organizer identity.
- Adds whole-workflow normalization for backgrounds, comments, and ungrouped
  nodes with validation, rollback, and one undo transaction.
- Preserves node-only, selected-group, title-token, and algorithm controls.

The prefixed `workflow-graph-organizer-v1.0.0` GitHub release was created, but
this version was not published to the Comfy Registry because the Registry's
tagged publication action used an obsolete comfy-cli option. The corrected
Registry publication starts with `1.0.1`.
