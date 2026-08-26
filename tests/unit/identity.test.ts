import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  COMMAND_PREFIX,
  CURRENT_VERSION,
  EXTENSION_NAME,
  REPOSITORY_URL,
  SETTINGS_PREFIX,
  UPSTREAM_COMMAND_PREFIX,
  UPSTREAM_EXTENSION_NAME,
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

  it("registers only workflow graph organizer IDs with ComfyUI", async () => {
    type RegisteredExtension = {
      name: string;
      commands: Array<{ id: string }>;
      keybindings: Array<{ commandId: string }>;
      menuCommands: Array<{ commands: string[] }>;
      settings: Array<{ id: string; category: string[] }>;
    };
    const globalScope = globalThis as typeof globalThis & {
      app?: {
        registerExtension: (extension: unknown) => void;
        extensionManager?: {
          setting?: { get: <T>(_id: string) => T | undefined };
        };
        canvas?: null;
      };
    };
    const originalApp = globalScope.app;
    let registeredExtension: RegisteredExtension | undefined;

    globalScope.app = {
      registerExtension: (extension) => {
        registeredExtension = extension as RegisteredExtension;
      },
      extensionManager: { setting: { get: () => undefined } },
      canvas: null,
    };
    vi.resetModules();

    try {
      await import("../../src/index");

      expect(registeredExtension).toBeDefined();
      const extension = registeredExtension as RegisteredExtension;
      expect(extension.name).toBe("rurusasu.workflow-graph-organizer");
      expect(extension.commands.map(({ id }) => id)).toEqual([
        "workflow-graph-organizer.organize",
        "workflow-graph-organizer.organize-workflow",
        "workflow-graph-organizer.organize-groups",
      ]);
      expect(extension.keybindings.map(({ commandId }) => commandId)).toEqual([
        "workflow-graph-organizer.organize",
      ]);
      expect(extension.menuCommands.flatMap(({ commands }) => commands)).toEqual([
        "workflow-graph-organizer.organize-workflow",
        "workflow-graph-organizer.organize-groups",
      ]);
      expect(extension.settings.every(({ id }) =>
        id.startsWith("Workflow Graph Organizer."),
      )).toBe(true);
      expect(extension.settings.every(({ category }) =>
        category[0] === "Workflow Graph Organizer",
      )).toBe(true);

      const registrationIds = JSON.stringify({
        name: extension.name,
        commands: extension.commands.map(({ id }) => id),
        keybindings: extension.keybindings.map(({ commandId }) => commandId),
        menuCommands: extension.menuCommands.flatMap(({ commands }) => commands),
        settings: extension.settings,
      });
      expect(registrationIds).not.toContain(UPSTREAM_EXTENSION_NAME);
      expect(registrationIds).not.toContain(UPSTREAM_COMMAND_PREFIX);
      expect(registrationIds).not.toContain(["Node", "Organizer"].join(" "));
    } finally {
      vi.resetModules();
      if (originalApp === undefined) {
        delete globalScope.app;
      } else {
        globalScope.app = originalApp;
      }
    }
  });
});
