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
});
