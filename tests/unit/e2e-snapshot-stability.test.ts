import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("E2E snapshot stability contract", () => {
  it("waits for the complete ComfyUI surface before and after Fit View", () => {
    const helpers = readFileSync("tests/e2e/helpers.ts", "utf8");

    expect(helpers).toContain('querySelectorAll<HTMLElement>(".dom-widget")');
    expect(helpers).toContain("waitForSnapshotSurfaceToStabilize");

    const fitHelper = helpers.slice(
      helpers.indexOf("export async function fitGraphForSnapshot"),
      helpers.indexOf("export async function expectGraphCanvasScreenshot"),
    );
    expect(
      fitHelper.match(/waitForSnapshotSurfaceToStabilize\(page\)/g),
    ).toHaveLength(2);
  });

  it("waits for mounted subgraph widgets before organizing them", () => {
    const helpers = readFileSync("tests/e2e/helpers.ts", "utf8");
    const visualRegression = readFileSync(
      "tests/e2e/visual-regression.test.ts",
      "utf8",
    );

    expect(helpers).toContain(
      "export async function waitForSnapshotSurfaceToStabilize",
    );

    const subgraphTest = visualRegression.slice(
      visualRegression.indexOf('test("subgraph graph canvas after organize"'),
    );
    expect(subgraphTest).toMatch(
      /openFirstSubgraph\(page\);\s+await waitForSnapshotSurfaceToStabilize\(page\);\s+await triggerOrganize\(page\);/,
    );
  });

  it("does not baseline a graph hidden by ComfyUI's missing-model dialog", () => {
    const visualRegression = readFileSync(
      "tests/e2e/visual-regression.test.ts",
      "utf8",
    );

    expect(visualRegression).not.toContain('loadFixture("token-testing")');
  });
});
