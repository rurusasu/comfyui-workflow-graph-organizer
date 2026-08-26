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
    expect(REPOSITORY_URL).toBe(
      "https://github.com/rurusasu/comfyui-workflow-graph-organizer",
    );
    expect(CURRENT_VERSION).toBe("1.0.0");
  });

  it("keeps Registry and npm metadata distinct and synchronized", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const pyproject = readFileSync("pyproject.toml", "utf8");

    expect(packageJson.name).toBe("@rurusasu/workflow-graph-organizer");
    expect(packageJson.version).toBe("1.0.0");
    expect(pyproject).toContain('name = "workflow-graph-organizer"');
    expect(pyproject).toContain(
      'DisplayName = "ComfyUI Workflow Graph Organizer"',
    );
    expect(pyproject).toContain('PublisherId = "rurusasu"');
    expect(pyproject).toContain('version = "1.0.0"');
  });
});
