# Contributing

Keep contributions generic: do not add workflow- or model-specific product
branding. Use Node `24`, the pnpm version pinned in `package.json`, and `uv`
for Python-side tooling.

## Project governance

Maintainers make repository decisions through public issues and pull requests.
Be constructive, respect other contributors, and keep discussion focused on
reproducible technical evidence. Security reports follow [SECURITY.md](SECURITY.md),
not public issues.

```bash
pnpm install --frozen-lockfile
uv sync --locked --group dev
pnpm typecheck
pnpm test
pnpm build
pnpm test:lib
pnpm setup:e2e
pnpm test:e2e
```

`src/core.ts` must remain free of ComfyUI imports. Build before browser tests,
because ComfyUI loads `dist/`. Use checked-in fixtures in `tests/fixtures/`.
E2E evidence must use the dedicated `.test-comfy` WebUI, never a personal
workflow or separate instance.

## Issues and pull requests

Use the issue forms with a minimized workflow and expected/actual behavior.
Before opening a pull request, rebase or merge the approved target branch as
needed, run the applicable commands above, and describe the user-visible
change, fixtures, validation, documentation impact, and any compatibility
limit. Changes to package metadata or release automation require explicit
review of the corresponding release behavior.

Keep pull requests focused, include behavior tests, preserve AGPL-3.0 notices
and upstream attribution, and do not combine upstream synchronization with
product work. By contributing, you agree to AGPL-3.0 licensing.
