# Upstream relationship

ComfyUI Workflow Graph Organizer is an independently maintained fork of
[PBandDev/comfyui-node-organizer](https://github.com/PBandDev/comfyui-node-organizer).
It retains upstream history, copyright notices, and AGPL-3.0. Upstream does
not maintain or endorse this fork.

The configured remotes are `origin` for
`rurusasu/comfyui-workflow-graph-organizer` and `upstream` for
`PBandDev/comfyui-node-organizer`.

## Material differences

- Complete-workflow normalization handles backgrounds, comments, and ungrouped
  nodes after the upstream-derived node layout engine runs.
- Geometry validation, exact rollback, and one native undo transaction protect
  graph state when complete-workflow layout fails.
- Product identifiers use the `workflow-graph-organizer` namespace.

## Synchronizing upstream

Use a dedicated branch and keep synchronization separate from product work:

```bash
git fetch upstream --tags
git switch -c sync/upstream-2026-08-27 main
git merge --no-ff upstream/main
pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

Review and test the synchronization branch before merging it into `main`.
Resolve product-identity, public-documentation, and release-workflow conflicts
in favor of this fork's documented behavior; do not overwrite them blindly.
