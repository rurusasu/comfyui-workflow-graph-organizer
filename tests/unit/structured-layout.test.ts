import { describe, expect, it } from "vitest";
import * as core from "../../src/core";
import {
  captureWorkflowStructure,
  DEFAULT_STRUCTURED_LAYOUT_CONFIG,
  normalizeStructuredLayout,
  validateStructuredLayout,
} from "../../src/structured-layout";

describe("structured layout normalization", () => {
  it("exports the structured geometry API from the pure library entrypoint", () => {
    expect(core.captureWorkflowStructure).toBe(captureWorkflowStructure);
    expect(core.normalizeStructuredLayout).toBe(normalizeStructuredLayout);
    expect(core.validateStructuredLayout).toBe(validateStructuredLayout);
    expect(core.DEFAULT_STRUCTURED_LAYOUT_CONFIG).toBe(
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );
  });

  it("captures direct node owners by center and group parents by full containment", () => {
    const structure = captureWorkflowStructure({
      nodes: [
        {
          id: "inner-node",
          type: "Sampler",
          x: 150,
          y: 150,
          width: 80,
          height: 80,
        },
        {
          id: "outer-node",
          type: "Loader",
          x: 20,
          y: 20,
          width: 80,
          height: 80,
        },
        {
          id: "note",
          type: "MarkdownNote",
          x: 140,
          y: 140,
          width: 50,
          height: 50,
        },
        {
          id: "loose",
          type: "Output",
          x: 600,
          y: 20,
          width: 80,
          height: 80,
        },
      ],
      groups: [
        { id: "outer", x: 0, y: 0, width: 500, height: 500 },
        { id: "inner", x: 100, y: 100, width: 200, height: 200 },
      ],
    });

    expect(structure).toMatchObject({
      commentIds: ["note"],
      ungroupedNodeIds: ["loose"],
      rootGroupIds: ["outer"],
      parentByGroupId: { inner: "outer" },
      memberNodeIdsByGroupId: {
        outer: ["outer-node"],
        inner: ["inner-node"],
      },
    });
  });

  it("keeps equal-area contained backgrounds as separate stable roots", () => {
    const structure = captureWorkflowStructure({
      nodes: [],
      groups: [
        { id: "first", x: 0, y: 0, width: 300, height: 200 },
        { id: "second", x: 0, y: 0, width: 300, height: 200 },
      ],
    });

    expect(structure.parentByGroupId).toEqual({});
    expect(structure.rootGroupIds).toEqual(["first", "second"]);
  });

  it("places comments-only workflows at finite coordinates in original left-to-right order", () => {
    const nodes = [
      {
        id: "note-b",
        type: "MarkdownNote",
        x: 500,
        y: 200,
        width: 100,
        height: 60,
      },
      {
        id: "note-a",
        type: "MarkdownNote",
        x: 100,
        y: 40,
        width: 200,
        height: 80,
      },
    ];
    const structure = captureWorkflowStructure({ nodes, groups: [] });

    const result = normalizeStructuredLayout(
      { nodes, groups: [], structure },
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );

    expect(result.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: "note-b", x: 348, y: 40 },
      { id: "note-a", x: 100, y: 40 },
    ]);
    expect(
      result.nodes.every(
        (node) => Number.isFinite(node.x) && Number.isFinite(node.y),
      ),
    ).toBe(true);
  });

  it("fits nested backgrounds child-first and moves ungrouped nodes as one cluster", () => {
    const nodes = [
      {
        id: "outer-node",
        type: "Loader",
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      },
      {
        id: "inner-node",
        type: "Sampler",
        x: 300,
        y: 200,
        width: 100,
        height: 80,
      },
      {
        id: "loose-a",
        type: "Output",
        x: 800,
        y: 80,
        width: 50,
        height: 50,
      },
      {
        id: "loose-b",
        type: "Output",
        x: 900,
        y: 120,
        width: 80,
        height: 60,
      },
      {
        id: "comment",
        type: "MarkdownNote",
        x: 1_000,
        y: 1_000,
        width: 200,
        height: 100,
      },
    ];
    const groups = [
      { id: "outer", x: 0, y: 0, width: 500, height: 500 },
      { id: "inner", x: 250, y: 120, width: 220, height: 220 },
    ];
    const structure = captureWorkflowStructure({ nodes, groups });
    const originalLooseA = nodes[2]!;
    const originalLooseB = nodes[3]!;

    const result = normalizeStructuredLayout(
      { nodes, groups, structure },
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );
    const outer = result.groups.find((group) => group.id === "outer")!;
    const inner = result.groups.find((group) => group.id === "inner")!;
    const looseA = result.nodes.find((node) => node.id === "loose-a")!;
    const looseB = result.nodes.find((node) => node.id === "loose-b")!;
    const comment = result.nodes.find((node) => node.id === "comment")!;

    expect(structure.ungroupedNodeIds).toEqual(["loose-a", "loose-b"]);
    expect(outer).toMatchObject({ x: 52, y: 28, width: 444, height: 348 });
    expect(inner).toMatchObject({ x: 252, y: 128, width: 196, height: 200 });
    expect(looseA).toMatchObject({ x: 520, y: 100 });
    expect(looseB.x - looseA.x).toBe(originalLooseB.x - originalLooseA.x);
    expect(looseB.y - looseA.y).toBe(originalLooseB.y - originalLooseA.y);
    expect(looseA.x).toBeGreaterThanOrEqual(
      outer.x + outer.width + DEFAULT_STRUCTURED_LAYOUT_CONFIG.ungroupedGap,
    );
    expect(inner.x - outer.x).toBeGreaterThanOrEqual(
      DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.left,
    );
    expect(inner.y - outer.y).toBeGreaterThanOrEqual(
      DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.top,
    );
    expect(comment).toMatchObject({ x: outer.x, y: -144 });
  });

  it("packs root backgrounds by their original left-to-right order", () => {
    const nodes = [
      { id: "node-a", type: "Loader", x: 100, y: 100, width: 100, height: 100 },
      { id: "node-b", type: "Output", x: 600, y: 600, width: 100, height: 100 },
    ];
    const groups = [
      { id: "group-a", x: 0, y: 0, width: 300, height: 300 },
      { id: "group-b", x: 500, y: 500, width: 300, height: 300 },
    ];
    const structure = captureWorkflowStructure({ nodes, groups });

    const result = normalizeStructuredLayout(
      { nodes, groups, structure },
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );

    expect(result.groups).toEqual([
      { id: "group-a", x: 52, y: 28, width: 196, height: 220 },
      { id: "group-b", x: 272, y: 28, width: 196, height: 220 },
    ]);
    expect(result.nodes.map(({ id, x, y }) => ({ id, x, y }))).toEqual([
      { id: "node-a", x: 100, y: 100 },
      { id: "node-b", x: 320, y: 100 },
    ]);
  });

  it("preserves empty workflows without producing geometry", () => {
    const structure = captureWorkflowStructure({ nodes: [], groups: [] });
    const result = normalizeStructuredLayout(
      { nodes: [], groups: [], structure },
      DEFAULT_STRUCTURED_LAYOUT_CONFIG,
    );

    expect(result).toEqual({ nodes: [], groups: [] });
    expect(
      validateStructuredLayout(
        { ...result, structure },
        DEFAULT_STRUCTURED_LAYOUT_CONFIG,
      ),
    ).toEqual([]);
  });

  it("reports non-finite node and background geometry in input order", () => {
    expect(
      validateStructuredLayout(
        {
          nodes: [
            {
              id: "bad-node",
              type: "Sampler",
              x: Number.POSITIVE_INFINITY,
              y: 0,
              width: 100,
              height: 100,
            },
          ],
          groups: [
            { id: "bad-group", x: 0, y: 0, width: Number.NaN, height: 100 },
          ],
          structure: emptyStructure(),
        },
        DEFAULT_STRUCTURED_LAYOUT_CONFIG,
      ),
    ).toEqual([
      { type: "non-finite-geometry", itemId: "bad-node" },
      { type: "non-finite-geometry", itemId: "bad-group" },
    ]);
  });

  it("reports insufficient padding for direct members and nested backgrounds", () => {
    const structure = {
      ...emptyStructure(),
      rootGroupIds: ["outer"],
      parentByGroupId: { inner: "outer" },
      memberNodeIdsByGroupId: { outer: ["node"], inner: [] },
    };

    expect(
      validateStructuredLayout(
        {
          nodes: [
            { id: "node", type: "Sampler", x: 40, y: 72, width: 100, height: 100 },
          ],
          groups: [
            { id: "outer", x: 0, y: 0, width: 400, height: 400 },
            { id: "inner", x: 300, y: 100, width: 80, height: 100 },
          ],
          structure,
        },
        DEFAULT_STRUCTURED_LAYOUT_CONFIG,
      ),
    ).toEqual([
      { type: "background-padding", groupId: "outer", itemId: "node" },
      { type: "background-padding", groupId: "outer", itemId: "inner" },
    ]);
  });

  it("reports regular node, root background, and foreign-background overlaps", () => {
    const structure = {
      ...emptyStructure(),
      rootGroupIds: ["owned", "other"],
      memberNodeIdsByGroupId: { owned: ["member"], other: [] },
    };

    expect(
      validateStructuredLayout(
        {
          nodes: [
            { id: "member", type: "Sampler", x: 100, y: 100, width: 100, height: 100 },
            { id: "loose", type: "Output", x: 150, y: 100, width: 100, height: 100 },
          ],
          groups: [
            { id: "owned", x: 0, y: 0, width: 400, height: 400 },
            { id: "other", x: 120, y: 0, width: 400, height: 400 },
          ],
          structure,
        },
        DEFAULT_STRUCTURED_LAYOUT_CONFIG,
      ),
    ).toEqual([
      { type: "node-background-overlap", itemIds: ["member", "other"] },
      { type: "node-background-overlap", itemIds: ["loose", "owned"] },
      { type: "node-background-overlap", itemIds: ["loose", "other"] },
      { type: "node-overlap", itemIds: ["member", "loose"] },
      { type: "background-overlap", itemIds: ["owned", "other"] },
    ]);
  });

  it("exempts a node's owner and all ancestors from foreign-background overlap checks", () => {
    const structure = {
      ...emptyStructure(),
      rootGroupIds: ["outer"],
      parentByGroupId: { inner: "outer" },
      memberNodeIdsByGroupId: { outer: [], inner: ["member"] },
    };

    expect(
      validateStructuredLayout(
        {
          nodes: [
            { id: "member", type: "Sampler", x: 100, y: 150, width: 100, height: 100 },
          ],
          groups: [
            { id: "outer", x: 0, y: 0, width: 400, height: 400 },
            { id: "inner", x: 50, y: 78, width: 198, height: 220 },
          ],
          structure,
        },
        DEFAULT_STRUCTURED_LAYOUT_CONFIG,
      ),
    ).toEqual([]);
  });

  it("reports comment-to-comment and comment-to-content overlaps", () => {
    const structure = {
      ...emptyStructure(),
      commentIds: ["note-a", "note-b"],
      rootGroupIds: ["group"],
      memberNodeIdsByGroupId: { group: ["member"] },
    };

    expect(
      validateStructuredLayout(
        {
          nodes: [
            { id: "member", type: "Sampler", x: 100, y: 100, width: 100, height: 100 },
            { id: "note-a", type: "MarkdownNote", x: 120, y: 100, width: 100, height: 100 },
            { id: "note-b", type: "MarkdownNote", x: 150, y: 100, width: 100, height: 100 },
          ],
          groups: [{ id: "group", x: 0, y: 0, width: 400, height: 400 }],
          structure,
        },
        DEFAULT_STRUCTURED_LAYOUT_CONFIG,
      ),
    ).toEqual([
      { type: "comment-overlap", itemIds: ["note-a", "note-b"] },
      { type: "comment-content-overlap", itemIds: ["note-a", "member"] },
      { type: "comment-content-overlap", itemIds: ["note-a", "group"] },
      { type: "comment-content-overlap", itemIds: ["note-b", "member"] },
      { type: "comment-content-overlap", itemIds: ["note-b", "group"] },
    ]);
  });
});

function emptyStructure() {
  return {
    commentIds: [],
    ungroupedNodeIds: [],
    rootGroupIds: [],
    parentByGroupId: {},
    memberNodeIdsByGroupId: {},
    originalGroupXById: {},
    originalCommentXById: {},
  };
}
