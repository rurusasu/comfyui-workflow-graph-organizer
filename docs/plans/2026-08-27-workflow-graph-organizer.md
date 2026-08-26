# ComfyUI Workflow Graph Organizer Implementation Plan

> Execution copy: checkbox state is tracked in the dotfiles worktree until this product repository exists.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `rurusasu/comfyui-workflow-graph-organizer`, release version `1.0.0` through Comfy Registry, install that public release into the user's ComfyUI, and prove the whole-workflow action works in the live WebUI.

**Architecture:** Preserve the upstream TypeScript layout framework and add a pure structured-geometry normalization/validation stage after it. A ComfyUI adapter owns one graph-change transaction, exact rollback, settings, commands, migration warnings, and toasts; dotfiles installs a pinned public release instead of vendoring the extension source.

**Tech Stack:** TypeScript 5.9, pnpm 10, Vitest 4, fast-check 4, Vite 7, Playwright 1.58, Python 3.14 for the live ComfyUI, Comfy Registry, GitHub Actions, chezmoi.

**Spec:** `docs/design/2026-08-27-workflow-graph-organizer.md`

## Global Constraints

- Display name is exactly `ComfyUI Workflow Graph Organizer`.
- Repository is exactly `rurusasu/comfyui-workflow-graph-organizer` and remains a GitHub fork of `PBandDev/comfyui-node-organizer`.
- Comfy Registry node ID is exactly `workflow-graph-organizer`.
- npm package name is exactly `@rurusasu/workflow-graph-organizer`.
- Frontend extension ID is exactly `rurusasu.workflow-graph-organizer`; command IDs use `workflow-graph-organizer.*`.
- Product, Registry, and npm versions start at `1.0.0`; GitHub release tag is `workflow-graph-organizer-v1.0.0`.
- Development and hosted CI use Node.js 24; `package.json` declares `engines.node >=24`.
- Preserve upstream commit history, AGPL-3.0, copyright notices, layout algorithms, group actions, title tokens, tests, and build infrastructure.
- Do not ship MiniMax, H3, model, VM, Docker, MCP, or Apple-Silicon-specific behavior in the public repository.
- Do not publish npm until separately reviewed; GitHub and Comfy Registry publication are required for this plan.
- Never commit Registry credentials, npm credentials, GitHub tokens, model files, generated outputs, or live user workflows.
- The original Node Organizer and the fork are replacement alternatives; double installation is unsupported and must produce a clear warning.
- Work in `/Users/ktome1995/Program/comfyui-workflow-graph-organizer`; preserve unrelated changes in the dotfiles checkout.

---

### Task 1: Create and Validate the Public Fork Baseline

**Files:**

- Create repository: `https://github.com/rurusasu/comfyui-workflow-graph-organizer`
- Create local checkout: `/Users/ktome1995/Program/comfyui-workflow-graph-organizer`
- Create: `docs/design/2026-08-27-workflow-graph-organizer.md`
- Create: `docs/plans/2026-08-27-workflow-graph-organizer.md`

**Interfaces:**

- Consumes: upstream `PBandDev/comfyui-node-organizer` at its current `main` and the approved design/plan from the isolated dotfiles worktree.
- Produces: a public GitHub fork, `origin`/`upstream` remotes, and branch `codex/whole-workflow-layout` with a passing upstream baseline.

- [ ] **Step 1: Prove the target repository does not already exist**

Run:

```bash
gh repo view rurusasu/comfyui-workflow-graph-organizer --json nameWithOwner,parent
```

Expected: repository-not-found. If it exists, inspect its `parent.nameWithOwner` and use it only when the parent is exactly `PBandDev/comfyui-node-organizer`; otherwise stop before modifying external state.

- [ ] **Step 2: Create the GitHub fork and rename it**

Run:

```bash
gh repo fork PBandDev/comfyui-node-organizer --clone=false
gh repo rename comfyui-workflow-graph-organizer --repo rurusasu/comfyui-node-organizer --yes
gh api repos/rurusasu/comfyui-workflow-graph-organizer --jq '{name: .full_name, parent: .parent.full_name, private: .private}'
```

Expected:

```json
{
  "name": "rurusasu/comfyui-workflow-graph-organizer",
  "parent": "PBandDev/comfyui-node-organizer",
  "private": false
}
```

- [ ] **Step 3: Clone with explicit remotes and create the implementation branch**

Run:

```bash
git clone https://github.com/rurusasu/comfyui-workflow-graph-organizer.git /Users/ktome1995/Program/comfyui-workflow-graph-organizer
git remote add upstream https://github.com/PBandDev/comfyui-node-organizer.git
git fetch --all --tags --prune
git switch -c codex/whole-workflow-layout
git remote -v
```

Expected: `origin` points to `rurusasu`, `upstream` points to `PBandDev`, and the branch is isolated from `main`.

- [ ] **Step 4: Copy the approved design and plan into the product repository**

Copy the approved files mechanically to:

```text
docs/design/2026-08-27-workflow-graph-organizer.md
docs/plans/2026-08-27-workflow-graph-organizer.md
```

Add this exact line below the copied plan title:

```markdown
> Execution copy: checkbox state is tracked in the dotfiles worktree until this product repository exists.
```

- [ ] **Step 5: Install the pinned toolchain and verify the upstream baseline**

Run:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm test:lib
```

Expected: all upstream checks pass before product changes.

- [ ] **Step 6: Commit the imported design artifacts**

```bash
git add docs/design docs/plans
git diff --cached --check
git commit -m "docs: add workflow graph organizer design"
```

---

### Task 2: Establish Collision-Free Product Identity

**Files:**

- Modify: `package.json`
- Modify: `pyproject.toml`
- Modify: `src/settings.ts`
- Modify: `src/debug.ts`
- Modify: `src/index.ts`
- Modify: `scripts/smoke-core-package.mjs`
- Modify: `tests/unit/index.test.ts`
- Create: `tests/unit/identity.test.ts`

**Interfaces:**

- Consumes: upstream metadata and registration constants.
- Produces: exported `EXTENSION_NAME`, `SETTINGS_PREFIX`, `COMMAND_PREFIX`, `UPSTREAM_EXTENSION_NAME`, `UPSTREAM_COMMAND_PREFIX`, `REPOSITORY_URL`, and `CURRENT_VERSION` with no upstream-owned registration IDs.

- [ ] **Step 1: Add a failing identity contract test**

Create `tests/unit/identity.test.ts` with assertions equivalent to:

```typescript
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMMAND_PREFIX,
  CURRENT_VERSION,
  EXTENSION_NAME,
  REPOSITORY_URL,
  SETTINGS_PREFIX,
} from "../../src/settings";

describe("public identity", () => {
  it("uses only workflow graph organizer product identifiers", () => {
    expect(EXTENSION_NAME).toBe("rurusasu.workflow-graph-organizer");
    expect(SETTINGS_PREFIX).toBe("Workflow Graph Organizer");
    expect(COMMAND_PREFIX).toBe("workflow-graph-organizer");
    expect(REPOSITORY_URL).toBe("https://github.com/rurusasu/comfyui-workflow-graph-organizer");
    expect(CURRENT_VERSION).toBe("1.0.0");
  });

  it("keeps Registry and npm metadata distinct and synchronized", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const pyproject = readFileSync("pyproject.toml", "utf8");
    expect(packageJson.name).toBe("@rurusasu/workflow-graph-organizer");
    expect(packageJson.version).toBe("1.0.0");
    expect(pyproject).toContain('name = "workflow-graph-organizer"');
    expect(pyproject).toContain('DisplayName = "ComfyUI Workflow Graph Organizer"');
    expect(pyproject).toContain('PublisherId = "rurusasu"');
    expect(pyproject).toContain('version = "1.0.0"');
  });
});
```

- [ ] **Step 2: Run the identity test and verify RED**

Run:

```bash
pnpm vitest run tests/unit/identity.test.ts tests/unit/index.test.ts
```

Expected: failures show upstream names, repository, publisher, and version.

- [ ] **Step 3: Rename every product-owned identifier**

Set these constants in `src/settings.ts`:

```typescript
export const EXTENSION_NAME = "rurusasu.workflow-graph-organizer";
export const SETTINGS_PREFIX = "Workflow Graph Organizer";
export const COMMAND_PREFIX = "workflow-graph-organizer";
export const UPSTREAM_EXTENSION_NAME = "comfy-node-organizer";
export const UPSTREAM_COMMAND_PREFIX = "node-organizer";
export const REPOSITORY_URL = "https://github.com/rurusasu/comfyui-workflow-graph-organizer";
export const CURRENT_VERSION = "1.0.0";
```

Replace literal `node-organizer.*` command IDs with `${COMMAND_PREFIX}.*`, rename menu/settings labels, and change log prefixes to `[workflow-graph-organizer]`. Update package and Registry metadata to the identities in the global constraints, add `"engines": { "node": ">=24" }`, and configure bump-my-version tags as `workflow-graph-organizer-v{new_version}`.

- [ ] **Step 4: Update the library smoke test and existing expectations**

Import `@rurusasu/workflow-graph-organizer` in the package smoke test. Update existing identity assertions without weakening algorithm, settings uniqueness, or version synchronization checks.

- [ ] **Step 5: Run focused and full checks**

```bash
pnpm vitest run tests/unit/identity.test.ts tests/unit/index.test.ts tests/unit/lib-build-config.test.ts
pnpm typecheck
pnpm test
pnpm build
pnpm test:lib
```

Expected: all pass and `rg -n 'PBandDev|comfy-node-organizer|node-organizer\.' src package.json pyproject.toml scripts` finds only explicit upstream-detection or attribution constants.

- [ ] **Step 6: Commit product identity**

```bash
git add package.json pnpm-lock.yaml pyproject.toml uv.lock src tests scripts
git diff --cached --check
git commit -m "feat: establish workflow graph organizer identity"
```

---

### Task 3: Add Pure Structured Geometry Normalization and Validation

**Files:**

- Create: `src/structured-layout.ts`
- Modify: `src/core.ts`
- Modify: `src/layout/types.ts`
- Create: `tests/unit/structured-layout.test.ts`
- Modify: `tests/unit/property.test.ts`
- Create: `tests/fixtures/whole-workflow-layout.json`

**Interfaces:**

- Consumes: upstream `FrameworkResult`, original node/background rectangles, node types, and stable IDs.
- Produces: `captureWorkflowStructure(input): WorkflowStructure`, `normalizeStructuredLayout(input, config): StructuredLayoutResult`, and `validateStructuredLayout(input, config): LayoutViolation[]` exported from the pure library.

- [ ] **Step 1: Define the public pure types and failing comments-only test**

Add these types to `src/structured-layout.ts`:

```typescript
export interface GeometryRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WorkflowNodeRect extends GeometryRect {
  readonly type: string;
}

export interface WorkflowStructure {
  readonly commentIds: readonly string[];
  readonly ungroupedNodeIds: readonly string[];
  readonly rootGroupIds: readonly string[];
  readonly parentByGroupId: Readonly<Record<string, string>>;
  readonly memberNodeIdsByGroupId: Readonly<Record<string, readonly string[]>>;
  readonly originalGroupXById: Readonly<Record<string, number>>;
  readonly originalCommentXById: Readonly<Record<string, number>>;
}

export interface StructuredLayoutConfig {
  readonly padding: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly rootGroupGap: number;
  readonly commentGap: number;
  readonly commentLaneGap: number;
  readonly ungroupedGap: number;
}

export interface StructuredLayoutInput {
  readonly nodes: readonly WorkflowNodeRect[];
  readonly groups: readonly GeometryRect[];
  readonly structure: WorkflowStructure;
}

export interface StructuredLayoutResult {
  readonly nodes: readonly WorkflowNodeRect[];
  readonly groups: readonly GeometryRect[];
}

export type LayoutViolation =
  | { readonly type: "non-finite-geometry"; readonly itemId: string }
  | { readonly type: "background-padding"; readonly groupId: string; readonly itemId: string }
  | {
      readonly type:
        | "node-overlap"
        | "background-overlap"
        | "node-background-overlap"
        | "comment-overlap"
        | "comment-content-overlap";
      readonly itemIds: readonly [string, string];
    };

export function captureWorkflowStructure(input: {
  readonly nodes: readonly WorkflowNodeRect[];
  readonly groups: readonly GeometryRect[];
}): WorkflowStructure;

export function normalizeStructuredLayout(
  input: StructuredLayoutInput,
  config: StructuredLayoutConfig
): StructuredLayoutResult;

export function validateStructuredLayout(
  input: StructuredLayoutInput,
  config: StructuredLayoutConfig
): LayoutViolation[];
```

Write a test with two `MarkdownNote` nodes and no regular nodes/groups. Expect stable left-to-right placement at finite coordinates, preserving array order while sorting by original x.

- [ ] **Step 2: Verify comments-only RED**

```bash
pnpm vitest run tests/unit/structured-layout.test.ts -t "comments-only"
```

Expected: imports or comments-only behavior fail before implementation.

- [ ] **Step 3: Implement structure capture and comments-only layout**

Port the reviewed center-membership, nested containment, stable ordering, and finite comments-only fallback into pure TypeScript. Treat `MarkdownNote` as a comment and exclude it from background membership.

- [ ] **Step 4: Add failing nested-background and ungrouped-cluster tests**

Tests must assert:

```typescript
expect(structure.ungroupedNodeIds).toEqual(["loose-a", "loose-b"]);
expect(looseB.x - looseA.x).toBe(originalLooseB.x - originalLooseA.x);
expect(looseA.x).toBeGreaterThanOrEqual(root.x + root.width + config.ungroupedGap);
expect(inner.x - outer.x).toBeGreaterThanOrEqual(config.padding.left);
```

- [ ] **Step 5: Verify group/cluster RED, then implement inside-out fitting and translation**

Run the focused tests, confirm failure, then implement child-first group fitting, root packing, and one-delta ungrouped-cluster translation. Existing upstream positions are inputs; normalization must not re-run a graph algorithm.

- [ ] **Step 6: Add failing validation regressions**

Cover each exact violation type: non-finite node, non-finite group, owner padding, nested padding, node overlap, root background overlap, foreign-background overlap, comment overlap, and comment-content overlap. Owner and all owner ancestors must be excluded from foreign-background checks.

- [ ] **Step 7: Implement validation and stable error ordering**

Validate node/group arrays in input order and pair loops in ascending index order. Return violations rather than throwing so runtime can format and roll back consistently.

- [ ] **Step 8: Add property-based invariants**

Use `fast-check` to generate finite positive rectangles and prove:

```typescript
fc.assert(
  fc.property(generatedWorkflow, (input) => {
    const result = normalizeStructuredLayout(input, DEFAULT_STRUCTURED_LAYOUT_CONFIG);
    expect([...result.nodes, ...result.groups].every(hasFiniteGeometry)).toBe(true);
  })
);
```

Add properties for stable IDs, preserved ungrouped relative deltas, and idempotence after a second normalization.

- [ ] **Step 9: Export through the pure npm API and run all checks**

Export the structured types/functions from `src/core.ts`. Run:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:lib
```

- [ ] **Step 10: Commit the pure pipeline**

```bash
git add src tests
git diff --cached --check
git commit -m "feat: normalize complete workflow geometry"
```

---

### Task 4: Integrate One Transaction, Exact Rollback, and Result Reporting

**Files:**

- Modify: `src/adapter.ts`
- Modify: `src/runtime.ts`
- Create: `src/structured-runtime.ts`
- Create: `tests/unit/structured-runtime.test.ts`
- Modify: `tests/unit/adapter.test.ts`

**Interfaces:**

- Consumes: `WorkflowStructure`, `normalizeStructuredLayout`, `validateStructuredLayout`, upstream `layoutWithGroups`, and ComfyUI `GraphLike`.
- Produces: `runWholeWorkflowLayout(graph, organizeNodes, config): OrganizationSummary`, exact `snapshotGraphGeometry`/`restoreGraphGeometry`, and a typed failure carrying `violations`.

- [ ] **Step 1: Add graph snapshot and rollback tests first**

Define:

```typescript
export interface OrganizationSummary {
  readonly nodes: number;
  readonly groups: number;
  readonly comments: number;
  readonly violations: 0;
  readonly engineChanged: boolean;
}
```

The test graph records `beforeChange`, engine call, dirty, and `afterChange`. A successful action must emit exactly one sequence:

```typescript
expect(events).toEqual(["before", "engine", "dirty", "after"]);
```

A forced violation must restore every node position and every group position/size exactly and still call `afterChange` once.

- [ ] **Step 2: Verify transaction tests RED**

```bash
pnpm vitest run tests/unit/structured-runtime.test.ts
```

Expected: runtime API is absent.

- [ ] **Step 3: Extend GraphLike without weakening readonly input contracts**

Add optional `beforeChange(): void` and `afterChange(): void`, expose collapsed/title-height-aware geometry extraction, and mutate only positions/group bounds during apply/restore. Links, node types, modes, widget values, and connected inputs are never written.

- [ ] **Step 4: Implement the transaction runtime**

Use this control flow:

```typescript
const original = snapshotGraphGeometry(graph);
const structure = captureWorkflowStructure(original);
graph.beforeChange?.();
try {
  organizeNodes();
  const organized = snapshotGraphGeometry(graph);
  const engineChanged = !sameGeometry(original, organized);
  const normalized = normalizeStructuredLayout({ ...organized, structure }, config);
  const violations = validateStructuredLayout({ ...normalized, structure }, config);
  if (violations.length > 0) throw new StructuredLayoutError(violations);
  applyStructuredGeometry(graph, normalized);
  return summarize(normalized, structure, engineChanged);
} catch (error) {
  restoreGraphGeometry(graph, original);
  throw error;
} finally {
  graph.afterChange?.();
}
```

- [ ] **Step 5: Add engine-no-op and thrown-engine regressions**

Expect `engineChanged: false` when stable IDs and geometry do not change. A thrown engine error must be propagated after exact rollback; it must not be converted to success.

- [ ] **Step 6: Run focused and full checks**

```bash
pnpm vitest run tests/unit/structured-runtime.test.ts tests/unit/adapter.test.ts
pnpm typecheck
pnpm test
```

- [ ] **Step 7: Commit runtime integration**

```bash
git add src tests
git diff --cached --check
git commit -m "feat: apply structured layout atomically"
```

---

### Task 5: Make Whole-Workflow Layout the Primary ComfyUI Action

**Files:**

- Modify: `src/index.ts`
- Modify: `src/settings.ts`
- Modify: `src/debug.ts`
- Modify: `tests/unit/index.test.ts`
- Create: `tests/unit/extension-registration.test.ts`
- Modify: `tests/e2e/organize-workflow.test.ts`
- Modify: `tests/e2e/ui-smoke.test.ts`
- Create: `tests/e2e/replacement-warning.test.ts`

**Interfaces:**

- Consumes: `runWholeWorkflowLayout`, upstream node/group-only engine actions, and new structured settings.
- Produces: primary command `workflow-graph-organizer.organize`, node-only command `workflow-graph-organizer.organize-nodes-only`, group command `workflow-graph-organizer.organize-groups`, `Shift+O`, toasts, and upstream-install warning.

- [ ] **Step 1: Add failing registration and toast tests**

Capture the registered extension and assert:

```typescript
expect(extension.name).toBe("rurusasu.workflow-graph-organizer");
expect(extension.keybindings).toContainEqual({
  commandId: "workflow-graph-organizer.organize",
  combo: { key: "o", shift: true },
});
expect(commandIds).toEqual(
  expect.arrayContaining([
    "workflow-graph-organizer.organize",
    "workflow-graph-organizer.organize-nodes-only",
    "workflow-graph-organizer.organize-groups",
  ])
);
```

Assert success for `engineChanged: true`, warning detail matching `/no observable geometry change/i` for `false`, and error severity when runtime throws.

- [ ] **Step 2: Add a failing double-install detection test**

Seed the command registry with `node-organizer.organize-workflow`. Expect the fork to show a warning containing `disable or remove ComfyUI Node Organizer` and avoid executing the upstream command.

- [ ] **Step 3: Verify UI tests RED**

```bash
pnpm vitest run tests/unit/extension-registration.test.ts tests/unit/index.test.ts
```

- [ ] **Step 4: Split actions instead of nesting commands**

Refactor the existing engine action into a function that returns/throws. The whole-workflow command calls that engine function inside `runWholeWorkflowLayout`; it must never invoke another registered command. Keep selected-group and node-only paths direct.

- [ ] **Step 5: Add structured settings with validated defaults**

Register finite non-negative settings for padding, root gap, comment gap/lane gap, and ungrouped gap under `Workflow Graph Organizer`. Invalid persisted values use `DEFAULT_STRUCTURED_LAYOUT_CONFIG`.

- [ ] **Step 6: Implement replacement warning and outcome toasts**

Detect known upstream extension/command IDs before organization. Unique fork IDs prevent registration overwrites; the warning explains that co-installation is unsupported. Whole-workflow success and warning both fit the valid graph to view when enabled.

- [ ] **Step 7: Extend E2E for full workflow behavior**

Using the generic fixture, assert finite positions, no overlaps, padded backgrounds, comments outside backgrounds, one-step undo, reload persistence, and preserved link/node/widget semantics. Add an E2E warning case with a test-only upstream registration.

- [ ] **Step 8: Run all local checks**

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:lib
pnpm setup:e2e
pnpm test:e2e
```

- [ ] **Step 9: Commit ComfyUI integration**

```bash
git add src tests
git diff --cached --check
git commit -m "feat: organize complete workflows in ComfyUI"
```

---

### Task 6: Build the Public Documentation and Release Surface

**Files:**

- Rewrite: `README.md`
- Create: `CHANGELOG.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `UPSTREAM.md`
- Create: `.github/ISSUE_TEMPLATE/bug.yml`
- Create: `.github/ISSUE_TEMPLATE/feature.yml`
- Create: `.github/pull_request_template.md`
- Modify: `.github/workflows/ci.yaml`
- Rewrite: `.github/workflows/publish_action.yaml`
- Create: `tests/unit/documentation.test.ts`
- Create: `assets/workflow-graph-before.png`
- Create: `assets/workflow-graph-after.png`

**Interfaces:**

- Consumes: final product IDs, tested commands/settings, generic fixture, and release process.
- Produces: release-quality public documentation, hosted CI, and a manual existing-version publish workflow for GitHub/Registry.

- [ ] **Step 1: Add a failing documentation contract test**

Read the public files and assert the README contains headings for Features, Installation, Migration, Usage, Settings, Troubleshooting, Development, Versioning, Upstream, License, and Security. Assert it contains `workflow-graph-organizer`, the replacement warning, tested commands, and no MiniMax/H3 branding.

- [ ] **Step 2: Verify documentation RED**

```bash
pnpm vitest run tests/unit/documentation.test.ts
```

- [ ] **Step 3: Rewrite README as the primary public artifact**

Include all 14 sections from the spec: badges, concise positioning, generic before/after images, features, upstream comparison, Manager/manual install, update/uninstall, migration, all entry points, title tokens, settings table with actual defaults, compatibility, troubleshooting, development commands, release/versioning, security, AGPL attribution, and independently-maintained statement.

Every command must be copied from tested scripts. Do not add Registry/npm links until they resolve; use the GitHub release link for the candidate.

- [ ] **Step 4: Add supporting community documents and generic visual assets**

Generate before/after images only from `tests/fixtures/whole-workflow-layout.json`. Add meaningful alt text and keep source fixture reproducible. Document upstream synchronization in `UPSTREAM.md` with:

```bash
git fetch upstream --tags
git switch -c sync/upstream-2026-08-27 main
git merge --no-ff upstream/main
pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e
```

- [ ] **Step 5: Make CI immutable and complete**

Use Node.js 24 and `pnpm install --frozen-lockfile`; run typecheck, unit/property tests, build, library smoke, documentation contract, and E2E. Preserve failure artifacts.

- [ ] **Step 6: Replace the upstream bump-and-publish workflow**

The manual workflow reads current `1.0.0`, verifies all checks, creates tag `workflow-graph-organizer-v1.0.0`, creates a GitHub release, then publishes the same checkout with `Comfy-Org/publish-node-action`. It must not increment to `1.0.1`, write to `main`, reuse upstream `v1.0.0`, or publish npm. Require `REGISTRY_ACCESS_TOKEN` only in the Registry job.

- [ ] **Step 7: Run docs, release-metadata, and full checks**

```bash
pnpm vitest run tests/unit/documentation.test.ts tests/unit/identity.test.ts
pnpm typecheck
pnpm test
pnpm build
pnpm test:lib
pnpm test:e2e
git diff --check
```

- [ ] **Step 8: Commit public release surface**

```bash
git add README.md CHANGELOG.md CONTRIBUTING.md SECURITY.md UPSTREAM.md assets .github tests package.json pyproject.toml
git diff --cached --check
git commit -m "docs: prepare public workflow organizer release"
```

---

### Task 7: Publish the GitHub Repository and Prove Hosted CI

**Files:**

- Remote branch: `origin/codex/whole-workflow-layout`
- Pull request: `codex/whole-workflow-layout` to `main`
- GitHub Actions runs for CI

**Interfaces:**

- Consumes: locally passing release candidate.
- Produces: reviewed public PR, merged `main`, and green hosted CI at the exact release commit.

- [ ] **Step 1: Run the pre-push completion gate**

```bash
git status --short
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm test:lib
pnpm test:e2e
git diff upstream/main...HEAD --check
```

Expected: only intentional commits, all checks pass.

- [ ] **Step 2: Push the feature branch and open a PR**

```bash
git push -u origin codex/whole-workflow-layout
gh pr create --base main --head codex/whole-workflow-layout --title "feat: publish Workflow Graph Organizer 1.0.0" --body-file .github/pr-release-body.md
```

The PR body links the design, lists migration and identity changes, reports local tests, and states that Registry/npm are not yet published.

- [ ] **Step 3: Inspect hosted checks and review threads**

```bash
gh pr checks --watch
gh pr view --json reviewDecision,statusCheckRollup,mergeStateStatus,url
```

Resolve actual review findings with focused commits and rerun both local and hosted checks.

- [ ] **Step 4: Merge using the repository-allowed method**

Inspect branch protection/rulesets first, then merge only when required checks and review state allow it. Verify `main` points to the merged release candidate and its hosted CI is green.

- [ ] **Step 5: Verify public repository content directly**

Open the public README and source URLs, verify images and internal links resolve, and confirm GitHub reports the parent fork as `PBandDev/comfyui-node-organizer`.

---

### Task 8: Publish Version 1.0.0 to Comfy Registry

**Files:**

- GitHub repository secret: `REGISTRY_ACCESS_TOKEN`
- GitHub release: `workflow-graph-organizer-v1.0.0`
- Comfy Registry entry: `workflow-graph-organizer@1.0.0`

**Interfaces:**

- Consumes: green `main`, release workflow, and a Registry token for publisher `rurusasu`.
- Produces: immutable public Registry version `1.0.0` installable by ComfyUI Manager/CLI.

- [ ] **Step 1: Verify the Registry publisher and token path without exposing secrets**

Check whether `REGISTRY_ACCESS_TOKEN` already exists with:

```bash
gh secret list --repo rurusasu/comfyui-workflow-graph-organizer
```

If missing, authenticate to Comfy Registry as `rurusasu`, create a repository-scoped publishing token, and set it with `gh secret set REGISTRY_ACCESS_TOKEN`. Never print or persist the token outside GitHub encrypted secrets.

- [ ] **Step 2: Dispatch the exact-version publish workflow**

```bash
gh workflow run publish_action.yaml --repo rurusasu/comfyui-workflow-graph-organizer --ref main
gh run watch --repo rurusasu/comfyui-workflow-graph-organizer --exit-status
```

Expected: test/build/E2E, prefixed GitHub tag/release, and Registry publish jobs pass.

- [ ] **Step 3: Verify immutable public artifacts**

Verify all of:

```bash
gh release view workflow-graph-organizer-v1.0.0 --repo rurusasu/comfyui-workflow-graph-organizer
curl -fsS https://api.comfy.org/nodes/workflow-graph-organizer
```

The Registry response must report node ID `workflow-graph-organizer`, version `1.0.0`, repository `rurusasu/comfyui-workflow-graph-organizer`, active status, AGPL-3.0, and a download URL.

- [ ] **Step 4: Update README Registry links only after they resolve**

Create a focused docs PR adding the verified Registry URL and install command. Merge after hosted CI; do not change product version.

---

### Task 9: Migrate Dotfiles to the Public Node and Install It Live

**Files:**

- Modify in dotfiles worktree: `chezmoi/.chezmoiignore.tmpl`
- Remove from dotfiles source: `chezmoi/dot_local/share/comfyui/ComfyUI/custom_nodes/comfyui-structured-layout/`
- Keep as user data: `chezmoi/dot_local/share/comfyui/ComfyUI/user/default/workflows/MiniMax-H3-Apple-Silicon-Q4-Organized.json`
- Create: `chezmoi/.chezmoiscripts/run_onchange_after_install-comfyui-custom-nodes_darwin.sh.tmpl`
- Modify: `tests/python/test_comfyui_structured_layout_contract.py`

**Interfaces:**

- Consumes: public Registry node `workflow-graph-organizer@1.0.0`.
- Produces: dotfiles that install a pinned public node and no longer own extension source.

- [ ] **Step 1: Confirm there is no competing ComfyUI installer before editing**

Run:

```bash
rg -n -i 'comfyui|custom_nodes|comfy node install' Taskfile.yml taskfiles chezmoi/.chezmoiscripts scripts nix tests
```

Expected: only the current workflow/source contract is present. Use the repository's established chezmoi-script mechanism rather than adding a Taskfile/shell duplicate.

- [ ] **Step 2: Replace the vendored-source contract with a pinned-public-node contract**

The Python contract must assert:

```python
self.assertFalse(EXTENSION_SOURCE.exists())
self.assertTrue(WORKFLOW_SOURCE.is_file())
self.assertIn("workflow-graph-organizer", installer_text)
self.assertIn("1.0.0", installer_text)
self.assertIn("comfy-cli==1.18.0", installer_text)
```

Run the focused test and verify it fails before changing installation ownership.

- [ ] **Step 3: Implement the declarative install and remove superseded source ownership**

Create `run_onchange_after_install-comfyui-custom-nodes_darwin.sh.tmpl` with a content hash that changes when either pinned version changes. It must skip cleanly when `$HOME/.local/share/comfyui/ComfyUI` does not exist and otherwise run:

```bash
uvx --from 'comfy-cli==1.18.0' comfy \
  --workspace "$HOME/.local/share/comfyui/ComfyUI" \
  --skip-prompt node install 'workflow-graph-organizer@1.0.0' \
  --exit-on-fail
```

Keep the Darwin ARM64 guard only for the model-specific workflow if that workflow remains platform-specific. Remove the standalone extension source from chezmoi in the same change.

- [ ] **Step 4: Validate dotfiles changes**

```bash
python3.14 -m unittest tests.python.test_comfyui_structured_layout_contract -v
git diff --check
SKIP=hermes-bootstrap-tests pre-commit run --files \
  chezmoi/.chezmoiignore.tmpl \
  chezmoi/.chezmoiscripts/run_onchange_after_install-comfyui-custom-nodes_darwin.sh.tmpl \
  tests/python/test_comfyui_structured_layout_contract.py
```

- [ ] **Step 5: Stop ComfyUI and preserve recoverable copies of replaced nodes**

Stop the server cleanly. Move the live `comfyui-node-organizer` and `comfyui-structured-layout` directories to a timestamped backup outside `custom_nodes`; do not recursively delete them before the public install is proven.

- [ ] **Step 6: Install from the public Registry, not the local checkout**

Use the environment's supported Comfy CLI/Manager command to install exactly `workflow-graph-organizer@1.0.0`. Verify installed metadata and source remote/download origin point to the public Registry/GitHub artifact, not `/Users/ktome1995/Program/comfyui-workflow-graph-organizer`.

- [ ] **Step 7: Restart ComfyUI and prove extension loading**

Start the existing ComfyUI server on `127.0.0.1:8288`. Verify `/system_stats` returns 200, startup logs contain `workflow-graph-organizer` without import/build errors, and the served frontend bundle contains `rurusasu.workflow-graph-organizer`.

- [ ] **Step 8: Commit the dotfiles migration**

Stage only owned dotfiles changes, rerun the focused validation, and commit directly in the isolated worktree without invoking the repository wrapper that targets `~/.dotfiles`.

---

### Task 10: Apply the Public Node in WebUI and Complete the End-to-End Audit

**Files and runtime state:**

- Live WebUI: `http://127.0.0.1:8288/`
- Test workflow copy in ComfyUI user workflows
- ComfyUI history/logs and browser toasts
- Public GitHub/Registry artifacts

**Interfaces:**

- Consumes: installed Registry release and running ComfyUI.
- Produces: direct live proof that the public release organizes a real workflow safely.

- [ ] **Step 1: Create a recoverable test copy of the workflow**

Duplicate the organized workflow under a test-only filename so the user's open unsaved tab is never overwritten. Record pre-action links, node types, modes, widget values, connected inputs, and geometry.

- [ ] **Step 2: Verify all WebUI entry points**

Hard reload the WebUI. Confirm the action bar, canvas menu, Extensions menu, settings category, version `1.0.0`, and `Shift+O` command are present. Confirm the old Node Organizer action is absent.

- [ ] **Step 3: Run Organize Workflow on the test copy**

Invoke the public node from WebUI. Capture the toast and confirm success or the documented no-observable-change warning, with no error toast or console exception.

- [ ] **Step 4: Verify geometry and semantics after the actual UI action**

Save the test copy and validate:

- all node/group coordinates and dimensions are finite;
- no node-node, root-background, comment, or foreign-background overlaps;
- configured background padding is satisfied;
- ungrouped nodes sit outside foreign backgrounds;
- comments do not overlap content;
- links, node types, modes, widget values, and connected inputs exactly match the recorded pre-action values.

- [ ] **Step 5: Verify one-step undo and repeatability**

Undo once and confirm exact original geometry. Redo or run organization twice and confirm valid, idempotent output with no geometry drift.

- [ ] **Step 6: Perform the requirement-by-requirement completion audit**

Collect authoritative evidence for:

1. public GitHub fork and parent relationship;
2. green hosted CI at the release commit;
3. GitHub release/tag `workflow-graph-organizer-v1.0.0`;
4. active Comfy Registry `workflow-graph-organizer@1.0.0`;
5. live install source is the public release;
6. ComfyUI startup loaded the extension;
7. WebUI action executed on a real workflow;
8. geometry, semantic preservation, undo, and repeatability passed;
9. dotfiles no longer vendor the extension and pin the public version;
10. public README and support documents render with working links.

Treat missing or indirect evidence as incomplete and continue until every item is proven.
