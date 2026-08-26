import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_STRUCTURED_LAYOUT_CONFIG,
  readStructuredLayoutConfig,
  SETTING_IDS,
} from "../../src/settings";

type Toast = {
  severity?: string;
  summary?: string;
  detail?: string;
};

type RegisteredExtension = {
  name: string;
  commands: Array<{ id: string; function: () => void }>;
  keybindings: Array<{
    commandId: string;
    combo: { key: string; shift?: boolean };
  }>;
  menuCommands: Array<{ path: string[]; commands: string[] }>;
  actionBarButtons: Array<{ onClick: () => void }>;
  getCanvasMenuItems: () => Array<{ content: string; callback: () => void } | null>;
  settings: Array<{ id: string; category: string[] }>;
};

async function register(options?: {
  readonly result?: {
    nodes: number;
    groups: number;
    comments: number;
    violations: 0;
    engineChanged: boolean;
  };
  readonly failure?: Error;
  readonly commandIds?: readonly string[];
  readonly extensionNames?: readonly string[];
  readonly settings?: Readonly<Record<string, unknown>>;
}): Promise<{
  extension: RegisteredExtension;
  toasts: Toast[];
  execute: ReturnType<typeof vi.fn>;
  runWholeWorkflowLayout: ReturnType<typeof vi.fn>;
  restore: () => void;
}> {
  const runWholeWorkflowLayout = vi.fn(() => {
    if (options?.failure) throw options.failure;
    return options?.result ?? {
      nodes: 4,
      groups: 1,
      comments: 1,
      violations: 0 as const,
      engineChanged: true,
    };
  });
  const execute = vi.fn();
  const toasts: Toast[] = [];
  let extension: RegisteredExtension | undefined;
  const globalScope = globalThis as typeof globalThis & { app?: unknown };
  const originalApp = globalScope.app;

  vi.resetModules();
  vi.doMock("../../src/runtime", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../src/runtime")>()),
    getCurrentGraph: () => ({ _nodes: [], _groups: [], links: new Map() }),
    getSelectedGroups: () => [],
    runWholeWorkflowLayout,
  }));

  globalScope.app = {
    registerExtension: (registered: unknown) => {
      extension = registered as RegisteredExtension;
    },
    extensions: (options?.extensionNames ?? []).map((name) => ({ name })),
    extensionManager: {
      setting: {
        get: <T>(id: string): T | undefined => options?.settings?.[id] as T | undefined,
      },
      command: {
        commands: (options?.commandIds ?? []).map((id) => ({ id })),
        execute,
      },
      toast: { add: (toast: Toast) => toasts.push(toast) },
    },
    canvas: {
      graph: { _nodes: [], _groups: [], links: new Map() },
      selectedItems: new Set(),
    },
  };

  await import("../../src/index");
  if (!extension) throw new Error("Extension was not registered");

  return {
    extension,
    toasts,
    execute,
    runWholeWorkflowLayout,
    restore: () => {
      vi.doUnmock("../../src/runtime");
      vi.resetModules();
      if (originalApp === undefined) delete globalScope.app;
      else globalScope.app = originalApp;
    },
  };
}

function primaryCommand(extension: RegisteredExtension): () => void {
  const command = extension.commands.find(
    ({ id }) => id === "workflow-graph-organizer.organize",
  );
  if (!command) throw new Error("Missing primary organize command");
  return command.function;
}

describe("whole-workflow extension registration", () => {
  it("registers the exact primary, node-only, and group command collection", async () => {
    const registered = await register();
    try {
      expect(registered.extension.name).toBe("rurusasu.workflow-graph-organizer");
      expect(registered.extension.commands.map(({ id }) => id)).toEqual([
        "workflow-graph-organizer.organize",
        "workflow-graph-organizer.organize-nodes-only",
        "workflow-graph-organizer.organize-groups",
      ]);
      expect(registered.extension.keybindings).toEqual([
        {
          commandId: "workflow-graph-organizer.organize",
          combo: { key: "o", shift: true },
        },
      ]);
      expect(registered.extension.menuCommands).toEqual([
        {
          path: ["Extensions", "Workflow Graph Organizer"],
          commands: [
            "workflow-graph-organizer.organize",
            "workflow-graph-organizer.organize-nodes-only",
            "workflow-graph-organizer.organize-groups",
          ],
        },
      ]);
    } finally {
      registered.restore();
    }
  });

  it("routes the primary action through the whole-workflow runtime without nesting commands", async () => {
    const registered = await register();
    try {
      primaryCommand(registered.extension)();
      expect(registered.runWholeWorkflowLayout).toHaveBeenCalledOnce();
      expect(registered.execute).not.toHaveBeenCalled();
      expect(registered.toasts).toEqual([
        expect.objectContaining({ severity: "success" }),
      ]);
      expect(registered.toasts[0]?.detail).toContain("4 nodes");
    } finally {
      registered.restore();
    }
  });

  it("warns truthfully when the engine makes no observable geometry change", async () => {
    const registered = await register({
      result: { nodes: 4, groups: 1, comments: 1, violations: 0, engineChanged: false },
    });
    try {
      primaryCommand(registered.extension)();
      expect(registered.toasts).toEqual([
        expect.objectContaining({
          severity: "warn",
          detail: expect.stringMatching(/no observable geometry change/i),
        }),
      ]);
      expect(registered.toasts[0]?.detail).toMatch(/backgrounds and comments were normalized/i);
    } finally {
      registered.restore();
    }
  });

  it("surfaces a runtime failure as an error toast and rethrows it", async () => {
    const failure = new Error("structured layout failed");
    const registered = await register({ failure });
    try {
      expect(primaryCommand(registered.extension)).toThrow(failure);
      expect(registered.toasts).toEqual([
        expect.objectContaining({ severity: "error", detail: "structured layout failed" }),
      ]);
    } finally {
      registered.restore();
    }
  });

  it("warns about the upstream extension without running its command", async () => {
    const registered = await register({
      commandIds: ["node-organizer.organize-workflow"],
      extensionNames: ["comfy-node-organizer"],
    });
    try {
      primaryCommand(registered.extension)();
      expect(registered.toasts).toContainEqual(
        expect.objectContaining({
          severity: "warn",
          detail: expect.stringContaining("disable or remove ComfyUI Node Organizer"),
        }),
      );
      expect(registered.execute).not.toHaveBeenCalled();
      expect(registered.runWholeWorkflowLayout).toHaveBeenCalledOnce();
    } finally {
      registered.restore();
    }
  });
});

describe("structured settings", () => {
  it("uses a finite non-negative persisted value per field and falls back independently", () => {
    const config = readStructuredLayoutConfig((id) => {
      const values: Record<string, unknown> = {
        [SETTING_IDS.BACKGROUND_PADDING_TOP]: 10,
        [SETTING_IDS.BACKGROUND_PADDING_RIGHT]: -1,
        [SETTING_IDS.BACKGROUND_PADDING_BOTTOM]: Number.POSITIVE_INFINITY,
        [SETTING_IDS.BACKGROUND_PADDING_LEFT]: Number.NaN,
        [SETTING_IDS.ROOT_GROUP_GAP]: 20,
        [SETTING_IDS.COMMENT_GAP]: -10,
        [SETTING_IDS.COMMENT_LANE_GAP]: 30,
        [SETTING_IDS.UNGROUPED_CLUSTER_GAP]: Number.NEGATIVE_INFINITY,
      };
      return values[id] as never;
    });

    expect(config).toEqual({
      padding: {
        top: 10,
        right: DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.right,
        bottom: DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.bottom,
        left: DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.left,
      },
      rootGroupGap: 20,
      commentGap: DEFAULT_STRUCTURED_LAYOUT_CONFIG.commentGap,
      commentLaneGap: 30,
      ungroupedGap: DEFAULT_STRUCTURED_LAYOUT_CONFIG.ungroupedGap,
    });
  });
});
