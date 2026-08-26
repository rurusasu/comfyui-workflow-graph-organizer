import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("E2E semantic snapshot contract", () => {
  it("projects graph semantics to serializable primitive fields", () => {
    const helpers = readFileSync("tests/e2e/helpers.ts", "utf8");
    const workflowTest = readFileSync(
      "tests/e2e/organize-workflow.test.ts",
      "utf8",
    );

    expect(helpers).toContain("export async function extractGraphSemantics");
    expect(helpers).toContain("widgets: cloneJsonValue(node.widgets_values)");
    expect(helpers).toContain("name: String(input.name)");
    expect(helpers).toContain("link: input.link == null ? null : Number(input.link)");
    expect(helpers).toContain("originId: Number(link.origin_id)");
    expect(helpers).toContain("targetId: Number(link.target_id)");
    expect(workflowTest.match(/extractGraphSemantics\(page\)/g)).toHaveLength(2);
    expect(workflowTest).not.toContain("inputs: node.inputs");
  });
});
