import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readPublicFile = (path: string): string => readFileSync(path, "utf8");

describe("public documentation", () => {
  it("makes the README a complete release artifact", () => {
    const readme = readPublicFile("README.md");

    expect(readme).toContain("# ComfyUI Workflow Graph Organizer");
    for (const heading of [
      "## Features",
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
    expect(readme).not.toMatch(/MiniMax|H3|video|Docker|VM/i);
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
