/** Atomic ComfyUI runtime integration for structured whole-workflow layout. */

import type { GraphLike } from "./adapter";
import { toGroupLayoutId } from "./layout/group-ids";
import {
  captureWorkflowStructure,
  DEFAULT_STRUCTURED_LAYOUT_CONFIG,
  normalizeStructuredLayout,
  validateStructuredLayout,
  type GeometryRect,
  type LayoutViolation,
  type StructuredLayoutConfig,
  type StructuredLayoutResult,
  type WorkflowNodeRect,
} from "./structured-layout";

export interface GraphGeometrySnapshot {
  readonly nodes: readonly WorkflowNodeRect[];
  readonly groups: readonly GeometryRect[];
}

export interface OrganizationSummary {
  readonly nodes: number;
  readonly groups: number;
  readonly comments: number;
  readonly violations: 0;
  readonly engineChanged: boolean;
}

export class StructuredLayoutError extends Error {
  readonly violations: readonly LayoutViolation[];

  constructor(violations: readonly LayoutViolation[]) {
    super(`Structured layout validation failed with ${violations.length} violation(s)`);
    this.name = "StructuredLayoutError";
    this.violations = violations;
  }
}

export function snapshotGraphGeometry(graph: GraphLike): GraphGeometrySnapshot {
  const nodes = graph._nodes.map((node) => nodeRect(node));
  const nodeIds = new Set(nodes.map((node) => node.id));

  if (graph.inputNode && !nodeIds.has(String(graph.inputNode.id))) {
    nodes.push(boundaryNodeRect(graph.inputNode, "SubgraphInput"));
  }
  if (graph.outputNode && !nodeIds.has(String(graph.outputNode.id))) {
    nodes.push(boundaryNodeRect(graph.outputNode, "SubgraphOutput"));
  }

  return {
    nodes,
    groups: graph._groups.map((group) => ({
      id: toGroupLayoutId(group.id),
      x: Number(group.pos[0]),
      y: Number(group.pos[1]),
      width: Number(group.size[0]),
      height: Number(group.size[1]),
    })),
  };
}

export function sameGeometry(
  left: GraphGeometrySnapshot,
  right: GraphGeometrySnapshot,
): boolean {
  return sameRects(left.nodes, right.nodes) && sameRects(left.groups, right.groups);
}

export function applyStructuredGeometry(
  graph: GraphLike,
  geometry: StructuredLayoutResult,
): void {
  const nodeById = new Map(geometry.nodes.map((node) => [node.id, node]));
  for (const node of graph._nodes) {
    const rect = nodeById.get(String(node.id));
    if (rect) {
      writeNodeDisplayPosition(node, rect);
    }
  }
  if (graph.inputNode) {
    const rect = nodeById.get(String(graph.inputNode.id));
    if (rect) {
      writePosition(graph.inputNode.pos, rect.x, rect.y);
    }
  }
  if (graph.outputNode) {
    const rect = nodeById.get(String(graph.outputNode.id));
    if (rect) {
      writePosition(graph.outputNode.pos, rect.x, rect.y);
    }
  }

  const groupById = new Map(geometry.groups.map((group) => [group.id, group]));
  for (const group of graph._groups) {
    const rect = groupById.get(toGroupLayoutId(group.id));
    if (rect) {
      writePosition(group.pos, rect.x, rect.y);
      writePosition(group.size, rect.width, rect.height);
    }
  }
}

export function restoreGraphGeometry(
  graph: GraphLike,
  original: GraphGeometrySnapshot,
): void {
  applyStructuredGeometry(graph, original);
}

export function runWholeWorkflowLayout(
  graph: GraphLike,
  organizeNodes: () => void,
  config: StructuredLayoutConfig = DEFAULT_STRUCTURED_LAYOUT_CONFIG,
): OrganizationSummary {
  const original = snapshotGraphGeometry(graph);
  const structure = captureWorkflowStructure(original);
  graph.beforeChange?.();

  try {
    organizeNodes();
    const organized = snapshotGraphGeometry(graph);
    const engineChanged = !sameGeometry(original, organized);
    const normalized = normalizeStructuredLayout({ ...organized, structure }, config);
    const violations = validateStructuredLayout({ ...normalized, structure }, config);
    if (violations.length > 0) {
      throw new StructuredLayoutError(violations);
    }
    applyStructuredGeometry(graph, normalized);
    graph.setDirtyCanvas?.(true, true);
    return summarize(normalized, structure.commentIds.length, engineChanged);
  } catch (error) {
    restoreGraphGeometry(graph, original);
    graph.setDirtyCanvas?.(true, true);
    throw error;
  } finally {
    graph.afterChange?.();
  }
}

function nodeRect(node: {
  readonly id: string | number;
  readonly type: string;
  readonly pos: ArrayLike<number>;
  readonly size: ArrayLike<number>;
  measure?(out: [number, number, number, number]): void;
}): WorkflowNodeRect {
  if (node.measure) {
    const measured: [number, number, number, number] = [0, 0, 0, 0];
    node.measure(measured);
    return {
      id: String(node.id),
      type: node.type,
      x: Number(measured[0]),
      y: Number(measured[1]),
      width: Number(measured[2]),
      height: Number(measured[3]),
    };
  }

  return {
    id: String(node.id),
    type: node.type,
    x: Number(node.pos[0]),
    y: Number(node.pos[1]),
    width: Number(node.size[0]),
    height: Number(node.size[1]),
  };
}

function writeNodeDisplayPosition(
  node: {
    readonly id: string | number;
    readonly type: string;
    readonly pos: ArrayLike<number>;
    readonly size: ArrayLike<number>;
    measure?(out: [number, number, number, number]): void;
  },
  target: WorkflowNodeRect,
): void {
  if (!node.measure) {
    writePosition(node.pos, target.x, target.y);
    return;
  }

  const current = nodeRect(node);
  writePosition(
    node.pos,
    target.x + Number(node.pos[0]) - current.x,
    target.y + Number(node.pos[1]) - current.y,
  );
}

function boundaryNodeRect(
  node: {
    readonly id: number;
    readonly pos: ArrayLike<number>;
    readonly size: ArrayLike<number>;
  },
  type: string,
): WorkflowNodeRect {
  return {
    id: String(node.id),
    type,
    x: Number(node.pos[0]),
    y: Number(node.pos[1]),
    width: Number(node.size[0]),
    height: Number(node.size[1]),
  };
}

function writePosition(position: ArrayLike<number>, x: number, y: number): void {
  const mutablePosition = position as { [index: number]: number };
  mutablePosition[0] = x;
  mutablePosition[1] = y;
}

function sameRects(
  left: readonly GeometryRect[],
  right: readonly GeometryRect[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightById = new Map(right.map((rect) => [rect.id, rect]));
  if (rightById.size !== right.length) {
    return false;
  }
  return left.every((rect) => {
    const other = rightById.get(rect.id);
    return (
      other !== undefined &&
      rect.x === other.x &&
      rect.y === other.y &&
      rect.width === other.width &&
      rect.height === other.height
    );
  });
}

function summarize(
  geometry: StructuredLayoutResult,
  comments: number,
  engineChanged: boolean,
): OrganizationSummary {
  return {
    nodes: geometry.nodes.length,
    groups: geometry.groups.length,
    comments,
    violations: 0,
    engineChanged,
  };
}
