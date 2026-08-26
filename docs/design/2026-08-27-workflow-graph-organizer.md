# ComfyUI Workflow Graph Organizer Fork Design

## Status and Relationship to the Earlier Design

This design supersedes the standalone-extension direction in
`2026-08-26-comfyui-structured-layout-hardening-design.md`. The reviewed
layout rules and regression tests remain valid, but their long-term home is a
public, maintained fork of ComfyUI Node Organizer rather than a JavaScript
extension vendored into dotfiles.

## Goal

Publish a generic ComfyUI extension that organizes an entire workflow graph:
regular nodes, nested backgrounds, comments, and nodes outside backgrounds.
It must retain the proven layout engine and group-title controls from ComfyUI
Node Organizer while adding deterministic post-layout normalization,
validation, one-step undo, and complete rollback on failure.

The product is not tied to MiniMax, H3, video generation, Apple Silicon, or
any particular workflow. Model-specific workflows remain test fixtures or
user data, never product branding or runtime logic.

## Product Identity

The public identities are intentionally distinct from the upstream project
and from existing workflow-file managers:

| Surface                    | Identity                                    |
| -------------------------- | ------------------------------------------- |
| Display name               | `ComfyUI Workflow Graph Organizer`          |
| GitHub repository          | `rurusasu/comfyui-workflow-graph-organizer` |
| Comfy Registry node ID     | `workflow-graph-organizer`                  |
| npm package                | `@rurusasu/workflow-graph-organizer`        |
| Frontend extension ID      | `rurusasu.workflow-graph-organizer`         |
| Command prefix             | `workflow-graph-organizer.*`                |
| Initial product version    | `1.0.0`                                     |
| Initial GitHub release tag | `workflow-graph-organizer-v1.0.0`           |

The Registry ID omits `ComfyUI` in accordance with Registry naming guidance.
The product version starts at `1.0.0` because the Registry node and scoped npm
package are new products. Upstream tags, including upstream `v1.0.0`, remain
unchanged; product release tags use the `workflow-graph-organizer-v` prefix to
avoid collisions.

## Fork, Attribution, and License

The repository is created as a GitHub fork of
`PBandDev/comfyui-node-organizer`, preserving commit history. Its remotes are:

- `origin`: `rurusasu/comfyui-workflow-graph-organizer`
- `upstream`: `PBandDev/comfyui-node-organizer`

The upstream AGPL-3.0 license, copyright notices, and attribution are retained.
The fork remains AGPL-3.0. The README identifies the upstream project and
clearly lists the fork's material differences. The fork does not imply that
PBandDev maintains or endorses the new project.

Upstream updates enter through a dedicated synchronization branch. They are
tested there before merging into the fork's `main`; feature branches do not
mix upstream synchronization with product changes.

## Scope

### Included

- Upstream DAG, horizontal, vertical, and grid layout algorithms.
- Group-title layout tokens and nested-group handling.
- Whole-workflow organization as the primary action.
- A node-only action retaining the narrower upstream behavior.
- Background fitting with explicit top, right, bottom, and left padding.
- Comment-lane layout.
- Ungrouped-node cluster separation.
- Finite-geometry and overlap validation.
- One undo transaction and complete rollback.
- Detection and warning when the original Node Organizer is also installed.
- GitHub, Comfy Registry, and scoped npm release metadata.
- Public documentation, tests, examples, and contribution guidance.

### Excluded

- Model installation or inference.
- Workflow execution or mutation of execution semantics.
- Model-specific or H3-specific code and branding.
- Runtime package installation.
- ComfyUI server, Python environment, Docker, MCP, or VM management.
- Automatic publication to Registry or npm before the release candidate is
  explicitly reviewed.

## User Experience

`Shift+O` and the primary **Organize Workflow** action perform the complete
workflow organization pipeline. The action is also available from the canvas
menu, action bar, and `Extensions > Workflow Graph Organizer`.

The narrower upstream behavior remains available as **Organize Nodes Only**.
Existing group-specific actions and group-title tokens continue to work.

The primary command reports one of three outcomes:

- success: the organizer changed graph geometry and validation passed;
- warning: the graph was valid but the layout engine made no observable
  geometry change;
- error: layout or validation failed and the original geometry was restored.

Messages state what happened without claiming that a swallowed or no-op
operation succeeded.

## Replacement and Migration Policy

The fork is a replacement for ComfyUI Node Organizer, not an add-on dependency.
It contains the required layout engine and works with no other custom-node
dependency.

Installing both extensions is unsupported. Every fork-owned extension,
setting, command, menu, and logging identifier uses the new namespace so an
accidental double installation does not overwrite upstream registrations.
The fork detects the known upstream extension or command IDs and shows a
clear warning telling the user to disable or remove the original package.

The migration guide instructs users to:

1. save open workflows;
2. disable or remove `comfyui-node-organizer`;
3. install `workflow-graph-organizer`;
4. restart ComfyUI and verify the version and command;
5. retain a recoverable copy of the original package until verification.

The user's dotfiles ultimately install a pinned fork release or commit and no
longer vendor the extension source. The organized MiniMax workflow may remain
dotfiles-managed as user data, but it is not shipped in the public repository.

## Architecture

The fork retains the upstream TypeScript source layout and adds small,
testable modules rather than embedding the reviewed JavaScript extension as a
second application.

The whole-workflow command runs this pipeline:

1. capture the original graph geometry and structural membership;
2. begin one ComfyUI graph-change transaction;
3. run the upstream layout engine;
4. fit nested backgrounds from inside to outside with configured padding;
5. pack root backgrounds in their stable left-to-right order;
6. move ungrouped regular nodes as one relative cluster after root backgrounds;
7. arrange comments in a non-overlapping lane;
8. validate all output geometry and structural constraints;
9. apply the valid result and commit the transaction, or restore the exact
   snapshot before ending the transaction.

The pure layout library accepts plain workflow geometry and returns plain
geometry plus a structured result. ComfyUI-specific graph access, undo calls,
toasts, menus, and settings remain in the frontend adapter. This separation
keeps the npm API usable without loading ComfyUI.

## Structural Model and Geometry Rules

Structure capture records:

- Markdown comment IDs;
- direct node membership for every background;
- parent relationships for nested backgrounds;
- stable root-background order;
- regular nodes with no owning background.

Node centers determine direct background membership. Full containment
determines nested-background parentage. Each regular node has at most one
direct owner: the smallest containing background.

Backgrounds are fitted from child to parent using configurable padding. Root
backgrounds are packed with a configurable gap. Ungrouped nodes preserve the
relative geometry produced by the layout engine and move together to the
right of all root backgrounds. If no root background exists, they retain the
engine's positions.

Comments are excluded from background membership. They are ordered stably and
placed in a lane above graph content. A comments-only workflow uses its
existing finite leftmost and topmost coordinates as the lane origin, avoiding
empty-set `Infinity` calculations.

## Validation and Failure Handling

Validation rejects:

- `NaN`, positive or negative infinity in any node or background coordinate
  or dimension;
- insufficient padding around direct members or nested backgrounds;
- regular node-to-node overlap;
- root background-to-root background overlap;
- a regular node overlapping a background other than its owner or an ancestor
  of its owner;
- comment-to-comment, comment-to-node, or comment-to-root-background overlap.

The transaction owns all node positions and background positions and sizes.
Any thrown error or validation violation restores the original snapshot before
the transaction ends. Errors are not swallowed. The canvas is marked dirty
after either a valid apply or a rollback so the restored state is rendered.

The observable-change result compares stable IDs and node/background geometry
immediately before and after the layout engine. Later background and comment
normalization does not turn an engine no-op into a claimed engine success.

## Settings

Existing upstream layout algorithm, gap, padding, fit-to-view, shortcut, and
debug settings remain available under the new namespace. The fork adds only
settings required by the new behavior:

- background padding per side;
- root-background gap;
- comment gap and lane gap;
- ungrouped-cluster gap;

Defaults produce a readable layout without requiring configuration. Settings
are validated as finite, non-negative numbers and fall back to documented
defaults when stored values are invalid.

## Test Strategy

Development follows red-green TDD. The existing upstream typecheck, Vitest,
pure-library smoke test, build, and Playwright E2E remain required. Added
tests cover:

- comments-only finite layout;
- non-finite node and background rejection;
- nested-background padding;
- ungrouped-cluster translation with relative geometry preserved;
- foreign-background overlap detection;
- comment, node, and root-background collision detection;
- one undo transaction on success;
- exact rollback on engine error or validation failure;
- changed versus no-op engine outcome reporting;
- renamed extension, command, setting, menu, logging, and package identities;
- warning when the original Node Organizer is present;
- a generic synthetic workflow fixture and at least one complex real workflow;
- idempotence: organizing an already organized graph produces the same valid
  geometry;
- execution-semantic preservation: links, node types, modes, widget values,
  and connected inputs remain unchanged.

Property-based tests exercise finite geometry, stable IDs, relative cluster
translation, and no-overlap invariants across generated graph shapes. E2E
tests verify the WebUI entry points, keyboard shortcut, toast severity,
fit-to-view, undo, and reload behavior.

## Public README Requirements

The public README is a release artifact, not a minimal project note. The
initial repository is not considered ready until the README includes:

1. product name, concise purpose, build/license/release badges, and a generic
   workflow screenshot or short demo with useful alt text;
2. a feature summary covering whole-graph layout, nested backgrounds,
   comments, ungrouped nodes, validation, rollback, tokens, and algorithms;
3. a comparison table distinguishing the fork from upstream Node Organizer
   and from workflow-file/sidebar managers;
4. installation instructions for ComfyUI Manager/Registry and manual Git
   installation, plus update and uninstall instructions;
5. an explicit migration guide from `comfyui-node-organizer`, including the
   unsupported double-install warning;
6. usage for action bar, canvas menu, Extensions menu, keyboard shortcut,
   node-only mode, group actions, and title tokens;
7. a settings reference with defaults and examples;
8. before/after examples based on a generic workflow, not MiniMax or H3;
9. compatibility and support policy for ComfyUI frontend/server versions and
   operating systems;
10. troubleshooting for missing actions, shortcut conflicts, no-op warnings,
    rollback errors, and stale browser bundles;
11. development setup, test commands, architecture overview, and contribution
    instructions;
12. release/versioning policy for Registry, npm, and prefixed GitHub tags;
13. security reporting guidance, AGPL-3.0 license notice, upstream attribution,
    and a clear statement that the fork is independently maintained;
14. links to CHANGELOG, CONTRIBUTING, SECURITY, upstream, Registry, npm, and
    issue templates once those destinations exist.

Documentation must avoid unsupported performance claims. Screenshots and
examples must be reproducible from checked-in generic fixtures. Commands must
be tested against the repository as released.

## Repository and Release Artifacts

The initial public repository includes:

- rewritten README meeting the requirements above;
- `CHANGELOG.md`, `CONTRIBUTING.md`, and `SECURITY.md`;
- issue forms for bugs and feature requests;
- pull-request template;
- Registry and scoped npm metadata;
- license and upstream attribution;
- generic workflow fixtures and visual assets;
- CI for formatting, typecheck, unit/property tests, library smoke test, build,
  and E2E;
- a documented upstream synchronization procedure.

GitHub is published first. Registry and npm publication remain separate,
explicit release steps after the `1.0.0` candidate passes local and hosted CI
and the README links are verified. No Registry or npm credentials are added to
the repository.

## Completion Criteria

- The dedicated GitHub fork exists under the approved name with the correct
  upstream relationship and remotes.
- All user-facing and internal identities use the new namespace.
- The whole-workflow pipeline passes unit, property, build, and E2E checks.
- Failure paths restore exact geometry in one undo transaction.
- The original Node Organizer is no longer required and double installation
  produces a clear warning.
- The README and supporting public documentation satisfy every documented
  requirement and contain no stale upstream names or broken local commands.
- Hosted CI passes on the public repository.
- A reviewed `1.0.0` release candidate is ready without prematurely publishing
  to Comfy Registry or npm.
- Dotfiles can install the reviewed fork revision without vendoring its source,
  and the live ComfyUI WebUI can execute the whole-workflow action successfully.
