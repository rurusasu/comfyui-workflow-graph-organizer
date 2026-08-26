import { afterEach, describe, expect, it, vi } from "vitest";
import type { GraphLike } from "../../src/adapter";

type RegisteredExtension = {
  commands: Array<{ id: string; function: () => void }>;
};

describe("whole-workflow primary action", () => {
  const globalScope = globalThis as typeof globalThis & { app?: unknown };
  const originalApp = globalScope.app;

  afterEach(() => {
    vi.resetModules();
    if (originalApp === undefined) delete globalScope.app;
    else globalScope.app = originalApp;
  });

  it("suppresses the engine dirty mark so the transaction emits exactly one final dirty event", async () => {
    const events: string[] = [];
    const graph: GraphLike = {
      _nodes: [
        {
          id: 1,
          type: "Sampler",
          title: "Sampler",
          pos: [100, 100],
          size: [100, 80],
          inputs: [],
          outputs: [],
        },
      ],
      _groups: [],
      links: new Map(),
      beforeChange: () => events.push("before"),
      setDirtyCanvas: () => events.push("dirty"),
      afterChange: () => events.push("after"),
    };
    let extension: RegisteredExtension | undefined;
    globalScope.app = {
      registerExtension: (registered: RegisteredExtension) => {
        extension = registered;
      },
      extensionManager: {
        setting: { get: () => undefined },
        command: { commands: [] },
        toast: { add: () => undefined },
      },
      canvas: { graph, selectedItems: new Set() },
    };

    await import("../../src/index");
    const primary = extension?.commands.find(
      ({ id }) => id === "workflow-graph-organizer.organize",
    );
    if (!primary) throw new Error("Primary whole-workflow command was not registered");

    primary.function();

    expect(events).toEqual(["before", "dirty", "after"]);
    expect(events.filter((event) => event === "dirty")).toHaveLength(1);
  });
});
