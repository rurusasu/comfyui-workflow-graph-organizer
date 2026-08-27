import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readPublicFile = (path: string): string => readFileSync(path, "utf8");

describe("public documentation", () => {
  it("ships the exact frontend bundle consumed by Registry publication", () => {
    expect(() =>
      execFileSync("git", ["ls-files", "--error-unmatch", "dist/index.js"], {
        stdio: "pipe",
      }),
    ).not.toThrow();
    expect(readPublicFile("__init__.py")).toContain('WEB_DIRECTORY = "./dist"');
    expect(readPublicFile("pyproject.toml")).toContain("includes = ['dist/']");

    const publish = readPublicFile(".github/workflows/publish_action.yaml");
    const ci = readPublicFile(".github/workflows/ci.yaml");
    expect(ci).toContain("git diff --exit-code -- dist/index.js");
    expect(publish).toContain("git diff --exit-code -- dist/index.js");
    expect(publish).toContain("test -s dist/index.js");
  });

  it("uses unique discoverability metadata for the public package", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      keywords?: unknown;
    };
    expect(packageJson.keywords).toEqual([
      "comfyui",
      "custom-node",
      "workflow",
      "graph-layout",
      "organizer",
      "extension",
    ]);
    expect(new Set(packageJson.keywords as string[]).size).toBe(
      (packageJson.keywords as string[]).length,
    );
  });

  it("makes the README a complete release artifact", () => {
    const readme = readPublicFile("README.md");

    expect(readme).toContain("# ComfyUI Workflow Graph Organizer");
    const opening = readme.slice(0, readme.indexOf("## Features"));
    expect(opening).toMatch(
      /Organizes the geometry of a complete ComfyUI workflow graph without changing\s+execution semantics\./,
    );
    expect(opening).toMatch(
      /Nodes, nested backgrounds, Markdown comments, and\s+ungrouped nodes are arranged in one native undo transaction\./,
    );
    for (const heading of [
      "## Features",
      "## Examples",
      "## Architecture",
      "## Installation",
      "## Migration",
      "## Usage",
      "## Settings",
      "## Troubleshooting",
      "## Development",
      "## Versioning",
      "## Upstream",
      "## License",
      "## Security",
    ]) {
      expect(readme).toContain(heading);
    }

    expect(readme).toContain("workflow-graph-organizer");
    expect(readme).toMatch(/unsupported.*double.*install|do not install both/i);
    expect(readme).toContain("pnpm install --frozen-lockfile");
    expect(readme).toContain("pnpm typecheck");
    expect(readme).toContain("pnpm test:e2e");
    expect(readme).toContain("capture:documentation-assets");
    expect(readme).toContain(".test-comfy");
    expect(readme).toContain("8199");
    expect(readme).toContain("tests/fixtures/whole-workflow-layout.json");
    expect(readme).toContain("tests/screenshots");
    expect(readme).toMatch(/preserves execution semantics/i);
    expect(readme).toMatch(/idempotent/i);
    expect(readme).toMatch(/success.*no-op.*rollback/is);
    expect(readme).toContain("one or more selected backgrounds/groups");
    expect(readme).toMatch(/nested.*\[HORIZONTAL\]/is);
    expect(readme).toContain("Portrait [2COL]");
    expect(readme).toMatch(/grid selection is token-driven/i);
    expect(readme).toMatch(/pure `src\/core\.ts`/i);
    expect(readme).toMatch(/ComfyUI adapter boundary/i);
    expect(readme).toMatch(/structured runtime.*transaction/is);

    for (const action of [
      "workflow-graph-organizer.organize",
      "workflow-graph-organizer.organize-nodes-only",
      "workflow-graph-organizer.organize-groups",
    ]) {
      expect(readme).toContain(action);
    }

    for (const [setting, defaultValue] of [
      ["Default Layout Algorithm", "sugiyama"],
      ["Horizontal Gap", "100"],
      ["Vertical Gap", "40"],
      ["Group Padding", "30"],
      ["Disconnected Node Gap", "150"],
      ["Background Padding Top", "72"],
      ["Background Padding Right", "48"],
      ["Background Padding Bottom", "48"],
      ["Background Padding Left", "48"],
      ["Root Background Gap", "24"],
      ["Comment Gap", "48"],
      ["Comment Lane Gap", "72"],
      ["Ungrouped Cluster Gap", "24"],
      ["Fit to View After Organize", "false"],
      ["Enable Debug Logging", "false"],
    ]) {
      expect(readme).toContain(`| ${setting} | \`${defaultValue}\` |`);
    }
    expect(readme).not.toMatch(/MiniMax|H3|video|Docker|VM/i);
    expect(readme).toMatch(/Manager update.*failure/i);

    const managerUpdate = readme.slice(
      readme.indexOf("### ComfyUI Manager / Registry"),
      readme.indexOf("### Manual Git installation"),
    );
    expect(managerUpdate).toMatch(/Manager.*update/i);
    expect(managerUpdate).toMatch(/restart\s+ComfyUI/i);
    expect(managerUpdate).toMatch(/hard-refresh the browser/i);
    expect(managerUpdate).toMatch(/Version\s+1\.0\.0/);

    const manualUpdate = readme.slice(
      readme.indexOf("### Manual Git installation"),
      readme.indexOf("## Migration"),
    );
    expect(manualUpdate).toContain("git pull --ff-only");
    expect(manualUpdate).toMatch(/restart\s+ComfyUI/i);
    expect(manualUpdate).toMatch(/hard-refresh the browser/i);
    expect(manualUpdate).toMatch(/Version\s+1\.0\.0/);
  });

  it("keeps release metadata, recovery, and failure artifacts complete", () => {
    const packageJson = JSON.parse(readPublicFile("package.json")) as {
      repository?: { type?: string; url?: string };
      homepage?: string;
      bugs?: { url?: string };
    };
    const pyproject = readPublicFile("pyproject.toml");
    const ci = readPublicFile(".github/workflows/ci.yaml");
    const publish = readPublicFile(".github/workflows/publish_action.yaml");
    const capture = readPublicFile("scripts/capture-documentation-assets.ts");
    const playwrightConfig = readPublicFile("playwright.config.ts");
    const globalSetup = readPublicFile("tests/e2e/global-setup.ts");

    expect(packageJson.repository).toEqual({
      type: "git",
      url: "git+https://github.com/rurusasu/comfyui-workflow-graph-organizer.git",
    });
    expect(packageJson.homepage).toBe(
      "https://github.com/rurusasu/comfyui-workflow-graph-organizer#readme",
    );
    expect(packageJson.bugs).toEqual({
      url: "https://github.com/rurusasu/comfyui-workflow-graph-organizer/issues",
    });
    expect(pyproject).toContain(
      'Repository = "https://github.com/rurusasu/comfyui-workflow-graph-organizer"',
    );

    expect(ci).toMatch(/if: failure\(\)/);
    expect(ci).toContain("tests/screenshots/");
    expect(ci).toMatch(/^permissions:\n  contents: read/m);
    expect(playwrightConfig).toMatch(/screenshot:\s*"only-on-failure"/);
    expect(publish).toContain("concurrency:");
    expect(publish).toContain("cancel-in-progress: false");
    expect(publish).toMatch(/^permissions:\n  contents: read/m);
    expect(publish).toContain("contents: write");
    expect(publish).toContain("workflow-graph-organizer-v1.0.0");
    expect(publish).toContain("git ls-remote --exit-code --refs");
    expect(publish).toContain("gh release view");
    expect(publish).toContain("tagName,name,targetCommitish");
    expect(publish).toContain("targetCommitish !== process.env.RELEASE_SHA");
    expect(publish).toContain(
      "https://api.comfy.org/nodes/$NODE_ID/versions/$VERSION",
    );
    expect(publish).toContain("https://api.comfy.org/nodes/$NODE_ID");
    expect(publish).toContain("NodeVersionStatusActive");
    expect(publish).toContain("NodeVersionStatusPending");
    expect(publish).toContain("NodeVersionStatusFlagged");
    expect(publish).toContain("NodeVersionStatusDeleted");
    expect(publish).toContain("NodeVersionStatusBanned");
    expect(publish).toContain("404");
    expect(publish).toContain('NODE_HTTP_STATUS === "404"');
    expect(publish).not.toContain("/versions?statuses=");
    expect(publish).toContain("tests/screenshots/");
    expect(publish).not.toMatch(/^\s*!\s*git /m);
    expect(publish).not.toMatch(/pnpm publish|NPM_TOKEN/);
    expect(publish.match(/REGISTRY_ACCESS_TOKEN/g)).toHaveLength(1);
    expect(publish.indexOf("REGISTRY_ACCESS_TOKEN")).toBeGreaterThan(
      publish.indexOf("registry:"),
    );
    expect(capture).toContain('import globalSetup from "../tests/e2e/global-setup.ts"');
    expect(capture).toContain('import globalTeardown from "../tests/e2e/global-teardown.ts"');
    expect(capture).toMatch(
      /await Promise\.resolve\(\s*app\.extensionManager\.command\.execute\(/,
    );
    expect(capture).toContain("withExclusiveCaptureRuntime");
    expect(capture).toContain("prepareStableCanvas");
    expect(capture).toContain("hideTransientNotifications");
    expect(capture).toContain("assertCaptureOrigin");
    expect(capture).toContain('route.abort("blockedbyclient")');
    expect(globalSetup).toContain('redirect: "error"');
    expect(publish).toContain('DisplayName = "ComfyUI Workflow Graph Organizer"');
    expect(publish).toContain('PublisherId = "rurusasu"');
  });

  it("publishes the reviewed checkout with the fixed official Registry action", () => {
    const publish = readPublicFile(".github/workflows/publish_action.yaml");

    expect(publish).toContain(
      "uses: Comfy-Org/publish-node-action@d2366e7abb6ab16f3bb03e3520ae25c8cf749bc9",
    );
    expect(publish).toMatch(
      /uses: Comfy-Org\/publish-node-action@d2366e7abb6ab16f3bb03e3520ae25c8cf749bc9\n\s+with:\n\s+skip_checkout: true\n\s+personal_access_token:/,
    );
  });

  it("documents a self-contained, dedicated three-command capture", () => {
    const readme = readPublicFile("README.md");
    const captureSection = readme.slice(
      readme.indexOf("### Reproduce documentation assets"),
      readme.indexOf("## Architecture"),
    );

    expect(captureSection).toContain("pnpm build\npnpm setup:e2e\npnpm capture:documentation-assets");
    expect(captureSection).not.toContain("comfy --skip-prompt");
    expect(captureSection).toMatch(/fails closed.*8199.*occupied/i);
    expect(captureSection).toMatch(/never.*reuses.*8199/is);
    expect(captureSection).toMatch(/never.*8288/i);
  });

  it("ships its public support documents, templates, and reproducible visuals", () => {
    for (const path of [
      "CHANGELOG.md",
      "CONTRIBUTING.md",
      "SECURITY.md",
      "UPSTREAM.md",
      ".github/ISSUE_TEMPLATE/bug.yml",
      ".github/ISSUE_TEMPLATE/feature.yml",
      ".github/pull_request_template.md",
      "assets/workflow-graph-before.png",
      "assets/workflow-graph-after.png",
    ]) {
      expect(existsSync(path), `Missing public artifact: ${path}`).toBe(true);
    }
  });

  it("keeps support documents and contribution forms individually reviewable", () => {
    const changelog = readPublicFile("CHANGELOG.md");
    const contributing = readPublicFile("CONTRIBUTING.md");
    const security = readPublicFile("SECURITY.md");
    const upstream = readPublicFile("UPSTREAM.md");
    const bugForm = readPublicFile(".github/ISSUE_TEMPLATE/bug.yml");
    const featureForm = readPublicFile(".github/ISSUE_TEMPLATE/feature.yml");
    const pullRequest = readPublicFile(".github/pull_request_template.md");

    expect(changelog).toContain("## [Unreleased]");
    expect(changelog).toContain("## [1.0.0] - pending");
    expect(changelog).toContain("### Added");
    expect(changelog).toMatch(/Registry and scoped npm package are not published/i);
    expect(contributing).toContain("Use Node `24`");
    expect(contributing).toContain("dedicated `.test-comfy` WebUI");
    expect(contributing).toContain("## Test-driven development");
    expect(contributing).toContain("tests/unit/property.test.ts");
    expect(contributing).toMatch(/fast-check/i);
    expect(contributing).toContain("## Pre-PR checklist");
    expect(security).toContain(
      "https://github.com/rurusasu/comfyui-workflow-graph-organizer/security/advisories/new",
    );
    expect(security).toMatch(/Do not open a public issue/i);
    expect(security).toMatch(/most recent published release/i);
    expect(upstream).toContain("git fetch upstream --tags");
    expect(upstream).toContain("git switch -c sync/upstream-2026-08-27 main");
    expect(upstream).toContain("git merge --no-ff upstream/main");
    expect(upstream).toMatch(/conflicts\s+in favor of this fork/i);
    expect(bugForm).toContain("id: comfyui-version");
    expect(bugForm).toContain("id: workflow");
    expect(bugForm).toMatch(
      /id: logs[\s\S]*?validations:\s*\n\s+required: true/,
    );
    expect(featureForm).toContain("id: acceptance");
    expect(featureForm).toContain("id: scope");
    expect(pullRequest).toContain("## Compatibility and release impact");
    expect(pullRequest).toContain("## Screenshots");
    expect(pullRequest).toMatch(/execution semantics/i);
    expect(pullRequest).toMatch(/upstream synchronization/i);
    expect(pullRequest).toContain("`pnpm test:e2e` when frontend behavior changes");
  });
});
