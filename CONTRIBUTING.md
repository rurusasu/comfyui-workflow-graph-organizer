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

## Test-driven development

Use test-driven development for behavior changes and bug fixes:

1. Add the smallest test that demonstrates the missing behavior and confirm it
   fails for the expected reason.
2. Implement the minimal change that makes the test pass.
3. Refactor only while the focused and full suites remain green.

Geometry invariants require property testing with fast-check. Extend
`tests/unit/property.test.ts` when a change affects finite coordinates,
containment, padding, overlap, idempotence, or rollback behavior. Add focused
unit tests for deterministic examples and Playwright coverage for visible
ComfyUI integration behavior.

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

## Pre-PR checklist

- [ ] I recorded the failing focused test before implementation and its passing
  result afterward.
- [ ] I added or updated fast-check property tests when an invariant changed.
- [ ] I ran `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:lib`.
- [ ] I ran `pnpm test:e2e` for frontend or ComfyUI integration changes.
- [ ] I updated public documentation, screenshots, and changelog entries when
  user-visible behavior changed.
- [ ] I reviewed compatibility, execution-semantics, release, security, and
  upstream-sync impact.
