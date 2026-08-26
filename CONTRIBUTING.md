# Contributing

Keep contributions generic: do not add workflow- or model-specific product
branding. Use Node `24`, the pnpm version pinned in `package.json`, and `uv`
for Python-side tooling.

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

Keep pull requests focused, include behavior tests, preserve AGPL-3.0 notices
and upstream attribution, and do not combine upstream synchronization with
product work. By contributing, you agree to AGPL-3.0 licensing.
