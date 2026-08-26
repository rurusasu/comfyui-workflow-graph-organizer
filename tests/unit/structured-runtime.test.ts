import { describe, expect, it } from "vitest";
import {
  runWholeWorkflowLayout,
  sameGeometry,
  StructuredLayoutError,
} from "../../src/structured-runtime";
import { runWholeWorkflowLayout as runFromRuntime } from "../../src/runtime";
import { DEFAULT_STRUCTURED_LAYOUT_CONFIG } from "../../src/structured-layout";
import type { GraphLike } from "../../src/adapter";

type TestNode = {
  id: number;
  type: string;
  title: string;
  pos: [number, number];
  size: [number, number];
  mode: number;
  widgets: { readonly value: string }[];
  inputs: { link: number | null; readonly name: string }[];
  outputs: { links: number[] | null; readonly name: string }[];
};

type TestGroup = {
  id: number;
  title: string;
  pos: [number, number];
  size: [number, number];
};

type TestGraph = Omit<GraphLike, "_nodes" | "_groups" | "links"> & {
  _nodes: TestNode[];
  _groups: TestGroup[];
  readonly events: string[];
  readonly links: Map<number, { id: number; origin_id: number; target_id: number }>;
};

function makeGraph(options?: {
  readonly nodes?: readonly TestNode[];
  readonly groups?: readonly TestGroup[];
}): TestGraph {
  const events: string[] = [];
  const nodes = options?.nodes ?? [
    {
      id: 1,
      type: "Sampler",
      title: "Sampler",
      pos: [100, 100],
      size: [100, 80],
      mode: 4,
      widgets: [{ value: "seed" }],
      inputs: [{ link: 7, name: "model" }],
      outputs: [{ links: [8], name: "image" }],
    },
  ];
  const groups = options?.groups ?? [];

  return {
    _nodes: nodes.map((node) => ({
      ...node,
      pos: [...node.pos] as [number, number],
      size: [...node.size] as [number, number],
      widgets: node.widgets.map((widget) => ({ ...widget })),
      inputs: node.inputs.map((input) => ({ ...input })),
      outputs: node.outputs.map((output) => ({
        ...output,
        links: output.links ? [...output.links] : null,
      })),
    })),
    _groups: groups.map((group) => ({
      ...group,
      pos: [...group.pos] as [number, number],
      size: [...group.size] as [number, number],
    })),
    links: new Map([[7, { id: 7, origin_id: 1, target_id: 2 }]]),
    beforeChange: () => events.push("before"),
    afterChange: () => events.push("after"),
    setDirtyCanvas: () => events.push("dirty"),
    events,
  } as TestGraph;
}

function geometryOf(graph: TestGraph) {
  return {
    nodes: graph._nodes.map((node) => ({ id: node.id, pos: [...node.pos] })),
    groups: graph._groups.map((group) => ({
      id: group.id,
      pos: [...group.pos],
      size: [...group.size],
    })),
  };
}

function semanticsOf(graph: TestGraph) {
  return {
    links: [...graph.links.entries()].map(([id, link]) => [id, { ...link }]),
    nodes: graph._nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      mode: node.mode,
      widgets: node.widgets.map((widget) => ({ ...widget })),
      inputs: node.inputs.map((input) => ({ ...input })),
      outputs: node.outputs.map((output) => ({
        ...output,
        links: output.links ? [...output.links] : null,
      })),
    })),
  };
}

describe("runWholeWorkflowLayout", () => {
  it("uses one transaction and renders after a successful structured layout", () => {
    const graph = makeGraph();

    const summary = runFromRuntime(
      graph,
      () => {
        graph.events.push("engine");
        graph._nodes[0]!.pos = [300, 200];
      },
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );

    expect(graph.events).toEqual(["before", "engine", "dirty", "after"]);
    expect(summary).toEqual({
      nodes: 1,
      groups: 0,
      comments: 0,
      violations: 0,
      engineChanged: true,
    });
  });

  it("reports an unchanged engine without promoting normalization to an engine change", () => {
    const graph = makeGraph();

    const summary = runWholeWorkflowLayout(
      graph,
      () => graph.events.push("engine"),
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );

    expect(summary.engineChanged).toBe(false);
    expect(graph.events).toEqual(["before", "engine", "dirty", "after"]);
  });

  it("compares geometry by stable ID when the upstream engine reorders arrays", () => {
    const graph = makeGraph({
      nodes: [
        {
          id: 1,
          type: "Loader",
          title: "Loader",
          pos: [100, 100],
          size: [100, 80],
          mode: 0,
          widgets: [],
          inputs: [],
          outputs: [],
        },
        {
          id: 2,
          type: "Output",
          title: "Output",
          pos: [300, 100],
          size: [100, 80],
          mode: 0,
          widgets: [],
          inputs: [],
          outputs: [],
        },
      ],
      groups: [{ id: 9, title: "Group", pos: [0, 0], size: [500, 300] }],
    });

    const summary = runWholeWorkflowLayout(
      graph,
      () => {
        graph.events.push("engine");
        graph._nodes.reverse();
        graph._groups.reverse();
      },
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );

    expect(summary.engineChanged).toBe(false);
    expect(sameGeometry(
      {
        nodes: [
          { id: "1", type: "Loader", x: 100, y: 100, width: 100, height: 80 },
          { id: "2", type: "Output", x: 300, y: 100, width: 100, height: 80 },
        ],
        groups: [{ id: "group:9", x: 0, y: 0, width: 500, height: 300 }],
      },
      {
        nodes: [
          { id: "2", type: "Output", x: 300, y: 100, width: 100, height: 80 },
          { id: "1", type: "Loader", x: 100, y: 100, width: 100, height: 80 },
        ],
        groups: [{ id: "group:9", x: 0, y: 0, width: 500, height: 300 }],
      },
    )).toBe(true);
  });

  it("propagates an engine failure after restoring exact geometry and rendering it", () => {
    const graph = makeGraph({
      groups: [{ id: 9, title: "Group", pos: [0, 0], size: [400, 300] }],
    });
    const original = geometryOf(graph);
    const failure = new Error("engine failed");

    let thrown: unknown;
    try {
      runWholeWorkflowLayout(
        graph,
        () => {
          graph.events.push("engine");
          graph._nodes[0]!.pos = [999, 888];
          graph._groups[0]!.pos = [777, 666];
          graph._groups[0]!.size = [1, 2];
          throw failure;
        },
        DEFAULT_STRUCTURED_LAYOUT_CONFIG,
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBe(failure);
    expect(geometryOf(graph)).toEqual(original);
    expect(graph.events).toEqual(["before", "engine", "dirty", "after"]);
  });

  it("throws all validation violations after exact rollback and dirty rendering", () => {
    const graph = makeGraph({
      nodes: [
        {
          id: 1,
          type: "Sampler",
          title: "Sampler",
          pos: [100, 100],
          size: [100, 80],
          mode: 4,
          widgets: [{ value: "seed" }],
          inputs: [{ link: 7, name: "model" }],
          outputs: [{ links: [8], name: "image" }],
        },
        {
          id: 2,
          type: "Output",
          title: "Output",
          pos: [250, 100],
          size: [100, 80],
          mode: 0,
          widgets: [],
          inputs: [],
          outputs: [],
        },
      ],
      groups: [{ id: 9, title: "Group", pos: [0, 0], size: [500, 300] }],
    });
    const original = geometryOf(graph);

    let thrown: unknown;
    try {
      runWholeWorkflowLayout(
        graph,
        () => {
          graph.events.push("engine");
          graph._nodes[0]!.pos = [Number.NaN, 999];
          graph._nodes[1]!.pos = [777, 666];
          graph._groups[0]!.pos = [555, 444];
          graph._groups[0]!.size = [1, 2];
        },
        DEFAULT_STRUCTURED_LAYOUT_CONFIG,
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(StructuredLayoutError);
    expect((thrown as StructuredLayoutError).violations).toEqual([
      { type: "non-finite-geometry", itemId: "1" },
      { type: "non-finite-geometry", itemId: "2" },
      { type: "non-finite-geometry", itemId: "group:9" },
      { type: "background-padding", groupId: "group:9", itemId: "1" },
      { type: "background-padding", groupId: "group:9", itemId: "2" },
    ]);
    expect(geometryOf(graph)).toEqual(original);
    expect(graph.events).toEqual(["before", "engine", "dirty", "after"]);
  });

  it("preserves links, node types, modes, widgets, and connected inputs", () => {
    const graph = makeGraph();
    const originalSemantics = semanticsOf(graph);

    runWholeWorkflowLayout(
      graph,
      () => {
        graph.events.push("engine");
        graph._nodes[0]!.pos = [300, 200];
      },
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );

    expect(semanticsOf(graph)).toEqual(originalSemantics);
  });
});
