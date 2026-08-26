import { describe, expect, it } from "vitest";
import {
  extractPinnedWorkflowTemplatesRequirement,
  setComfyManagerNetworkMode,
} from "../../scripts/setup-test-comfy-helpers";

describe("workflow template requirement parsing", () => {
  it("extracts the exact pinned requirement", () => {
    const requirements = [
      "torchsde",
      "comfyui-workflow-templates==0.9.26",
      "kornia>=0.7.1",
    ].join("\n");

    expect(extractPinnedWorkflowTemplatesRequirement(requirements)).toBe(
      "comfyui-workflow-templates==0.9.26",
    );
  });

  it("fails when the requirement is missing", () => {
    expect(() =>
      extractPinnedWorkflowTemplatesRequirement("torchsde==0.2.6"),
    ).toThrow(/comfyui-workflow-templates/i);
  });

  it("forces the dedicated manager into local mode without changing other settings", () => {
    const configured = setComfyManagerNetworkMode(
      "[default]\nnetwork_mode = public\nfile_logging = True\n",
    );

    expect(configured).toBe(
      "[default]\nnetwork_mode = local\nfile_logging = True\n",
    );
  });

  it("adds a local network mode when the manager config lacks one", () => {
    expect(setComfyManagerNetworkMode("[default]\nfile_logging = True\n")).toBe(
      "[default]\nfile_logging = True\nnetwork_mode = local\n",
    );
  });
});
