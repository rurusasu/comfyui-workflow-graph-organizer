## Summary

Describe the focused user-visible change.

## Compatibility and release impact

- [ ] I described any compatibility limit or confirmed none is introduced.
- [ ] I confirmed workflow execution semantics remain unchanged, or documented
  and tested an intentional semantic change.
- [ ] I assessed the impact on future upstream synchronization and documented
  any fork-specific conflict.
- [ ] I updated changelog, release, package, or public documentation material
  when the change affects it.

## Screenshots

- [ ] I included before/after screenshots for visible UI or layout changes, or
  explained why screenshots are not applicable.

## Validation

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:lib`
- [ ] `pnpm test:e2e` when frontend behavior changes

## Checklist

- [ ] Tests or fixtures cover the change.
- [ ] I recorded the exact commands and outcomes used for validation.
- [ ] Public documentation is updated when needed.
- [ ] AGPL-3.0 notices and upstream attribution remain intact.
- [ ] This is not an upstream synchronization merge.
