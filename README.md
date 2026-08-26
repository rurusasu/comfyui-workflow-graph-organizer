# ComfyUI Workflow Graph Organizer

[![CI](https://github.com/rurusasu/comfyui-workflow-graph-organizer/actions/workflows/ci.yaml/badge.svg)](https://github.com/rurusasu/comfyui-workflow-graph-organizer/actions/workflows/ci.yaml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/rurusasu/comfyui-workflow-graph-organizer?display_name=tag)](https://github.com/rurusasu/comfyui-workflow-graph-organizer/releases)

Organize a complete ComfyUI workflow graph: nodes, nested backgrounds, Markdown
comments, and ungrouped nodes. This is an independently maintained AGPL-3.0
fork of [ComfyUI Node Organizer](https://github.com/PBandDev/comfyui-node-organizer).

<p align="center">
  <img src="assets/workflow-graph-before.png" alt="Generic checked-in workflow fixture before organization, with nested backgrounds and a Markdown comment" width="49%">
  <img src="assets/workflow-graph-after.png" alt="The same generic checked-in workflow fixture after complete workflow organization" width="49%">
</p>

Both images are reproducible captures of the checked-in
[`tests/fixtures/whole-workflow-layout.json`](tests/fixtures/whole-workflow-layout.json)
fixture in this repository's dedicated `.test-comfy` WebUI.

## Features

- Whole-graph layout in one native undo transaction.
- Nested background fitting, root-background packing, comment lanes, and an
  ungrouped-node cluster.
- Finite-geometry, padding, and overlap validation with exact rollback on an
  error.
- **Organize Nodes Only**, selected **Organize Group**, title tokens, and the
  `sugiyama`, horizontal, and vertical algorithms.

## Comparison

| Capability | This fork | Upstream Node Organizer | Workflow-file/sidebar managers |
| --- | --- | --- | --- |
| Primary scope | Complete graph geometry | Node and group layout | File discovery and management |
| Backgrounds, comments, ungrouped nodes | Normalized together | Not this fork's pipeline | Outside scope |
| Validation and rollback | Yes | Not this fork's additions | Outside scope |
| Relationship | Replacement | Original project | Separate tools |

## Installation

### ComfyUI Manager / Registry

The Comfy Registry node is not published yet, so Manager/Registry installation
is not available. After the reviewed GitHub release candidate is published,
search for `workflow-graph-organizer` in ComfyUI Manager. No Registry URL is
included until it resolves.

### Manual Git installation

From ComfyUI's `custom_nodes` directory, clone the reviewed GitHub repository
and restart ComfyUI:

```bash
git clone https://github.com/rurusasu/comfyui-workflow-graph-organizer.git workflow-graph-organizer
```

To update, stop ComfyUI, enter that directory, and run:

```bash
git pull --ff-only
```

To uninstall, stop ComfyUI, remove the `workflow-graph-organizer` directory
from `custom_nodes` with your file manager, then restart ComfyUI.

## Migration

This extension replaces `comfyui-node-organizer`; it is not an add-on
dependency. Double installation is unsupported: do not install both extensions.

1. Save open workflows.
2. Disable or remove `comfyui-node-organizer`.
3. Install `workflow-graph-organizer`.
4. Restart ComfyUI and confirm **Organize Workflow** appears.
5. Keep a recoverable copy of the original package until verification.

The extension warns when the original organizer is still registered.

## Usage

Run **Organize Workflow** from the action bar, canvas menu,
`Extensions > Workflow Graph Organizer`, or `Shift+O`. Edit the shortcut in
ComfyUI **Settings > Keybinding**. **Organize Nodes Only** keeps the narrower
node-layout action; select one background for **Organize Group**.

### Title tokens

| Token | Effect |
| --- | --- |
| `[HORIZONTAL]` or `[1ROW]` | One horizontal row |
| `[VERTICAL]` or `[1COL]` | One vertical column |
| `[2ROW]` through `[9ROW]` | Distribute into that many rows |
| `[2COL]` through `[9COL]` | Distribute into that many columns |

Tokens are case-insensitive. Nested backgrounds use their own token;
backgrounds without one use the selected default algorithm.

## Settings

All settings are under **Workflow Graph Organizer**. Invalid stored
whole-workflow values fall back to these actual defaults.

| Setting | Default |
| --- | ---: |
| Default Layout Algorithm | `sugiyama` |
| Horizontal Gap / Vertical Gap | `100` / `40` |
| Group Padding / Disconnected Node Gap | `30` / `150` |
| Background Padding Top / Right / Bottom / Left | `72` / `48` / `48` / `48` |
| Root Background Gap / Comment Gap | `24` / `48` |
| Comment Lane Gap / Ungrouped Cluster Gap | `72` / `24` |
| Fit to View After Organize / Enable Debug Logging | `false` / `false` |

For example, increase **Root Background Gap** to add space between separately
packed root backgrounds. Default algorithms are `sugiyama`, `horizontal`, and
`vertical`.

## Compatibility

The release candidate is browser-tested against repository-pinned ComfyUI
`v0.18.1` on Linux. Registry metadata requires ComfyUI `>=0.3.0`; this is not
a claim that every intervening frontend version has been tested. Reports are
accepted for current Linux, macOS, and Windows ComfyUI installations with a
minimal workflow and frontend version.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Actions are missing | Restart ComfyUI and remove the original organizer before retrying. |
| `Shift+O` does not run | Resolve its conflict in **Settings > Keybinding**. |
| “Workflow normalized” warning | The node engine made no observable geometry change; backgrounds and comments were normalized. |
| Organization error | Original geometry is restored; report the minimal JSON and browser-console error. |
| Stale changes | Restart ComfyUI and hard-refresh the browser bundle. |

Use the [bug report form](.github/ISSUE_TEMPLATE/bug.yml) or
[feature request form](.github/ISSUE_TEMPLATE/feature.yml).

## Development

Use Node `24` and the pnpm version pinned in `package.json`. E2E uses only the
repository's dedicated `.test-comfy` instance; build first because ComfyUI
loads `dist/`.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm test:lib
pnpm setup:e2e
pnpm test:e2e
```

`src/core.ts` is the pure library entrypoint. See [CONTRIBUTING.md](CONTRIBUTING.md)
for development and test guidance.

## Versioning

The existing version is `1.0.0` in `package.json` and `pyproject.toml`. GitHub
tags use `workflow-graph-organizer-v<version>` to avoid upstream tag collisions.
The manual workflow runs only from reviewed `main`, verifies all gates, creates
that prefixed tag and GitHub release, then publishes the same checkout.

The Comfy Registry node and scoped npm package are not published. There is no
npm publication step and no Registry or npm link until those destinations
resolve. The [GitHub releases page](https://github.com/rurusasu/comfyui-workflow-graph-organizer/releases)
is the release-candidate destination; it currently has no `1.0.0` candidate.

## Upstream

This is an independently maintained fork of
[PBandDev/comfyui-node-organizer](https://github.com/PBandDev/comfyui-node-organizer).
It retains upstream history, AGPL-3.0 notices, and attribution; upstream does
not maintain or endorse this project. See [UPSTREAM.md](UPSTREAM.md).

## License

This project is licensed under [AGPL-3.0](LICENSE). Upstream notices and
attribution are retained.

## Security

Follow [SECURITY.md](SECURITY.md) for private vulnerability reporting.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history.
