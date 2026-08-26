import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readPublicFile = (path: string): string => readFileSync(path, "utf8");

describe("public documentation", () => {
  it("makes the README a complete release artifact", () => {
    const readme = readPublicFile("README.md");

    expect(readme).toContain("# ComfyUI Workflow Graph Organizer");
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
    expect(readme).toMatch(/restart ComfyUI.*hard-refresh the browser/i);
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

    for (const setting of [
      "Default Layout Algorithm",
      "Horizontal Gap",
      "Vertical Gap",
      "Group Padding",
      "Disconnected Node Gap",
      "Background Padding Top",
      "Background Padding Right",
      "Background Padding Bottom",
      "Background Padding Left",
      "Root Background Gap",
      "Comment Gap",
      "Comment Lane Gap",
      "Ungrouped Cluster Gap",
      "Fit to View After Organize",
      "Enable Debug Logging",
    ]) {
      expect(readme).toContain(setting);
    }
    expect(readme).not.toMatch(/MiniMax|H3|video|Docker|VM/i);
    expect(readme).toMatch(/Manager update.*failure/i);
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
    expect(publish).toContain('DisplayName = "ComfyUI Workflow Graph Organizer"');
    expect(publish).toContain('PublisherId = "rurusasu"');
  });

  it("documents a self-contained, dedicated three-command capture", () => {
    const readme = readPublicFile("README.md");
    const captureSection = readme.slice(
      readme.indexOf("### Reproduce documentation assets"),
      readme.indexOf("## Architecture"),
    );

    expect(captureSection).toContain("pnpm build\npnpm setup:e2e\npnpm capture:documentation-assets");
    expect(captureSection).not.toContain("comfy --skip-prompt");
    expect(captureSection).toMatch(/starts and stops only.*8199/i);
    expect(captureSection).toContain("If `8199` is already running");
    expect(captureSection).toMatch(/leaves it\s+running/i);
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
});
