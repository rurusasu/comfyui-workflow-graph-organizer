/** Pure geometry capture and normalization for complete workflow layouts. */

export interface GeometryRect {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface WorkflowNodeRect extends GeometryRect {
  readonly type: string;
}

export interface WorkflowStructure {
  readonly commentIds: readonly string[];
  readonly ungroupedNodeIds: readonly string[];
  readonly rootGroupIds: readonly string[];
  readonly parentByGroupId: Readonly<Record<string, string>>;
  readonly memberNodeIdsByGroupId: Readonly<Record<string, readonly string[]>>;
  readonly originalGroupXById: Readonly<Record<string, number>>;
  readonly originalCommentXById: Readonly<Record<string, number>>;
}

export interface StructuredLayoutConfig {
  readonly padding: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
  readonly rootGroupGap: number;
  readonly commentGap: number;
  readonly commentLaneGap: number;
  readonly ungroupedGap: number;
}

export interface StructuredLayoutInput {
  readonly nodes: readonly WorkflowNodeRect[];
  readonly groups: readonly GeometryRect[];
  readonly structure: WorkflowStructure;
}

export interface StructuredLayoutResult {
  readonly nodes: readonly WorkflowNodeRect[];
  readonly groups: readonly GeometryRect[];
}

interface MutableGeometryRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MutableWorkflowNodeRect extends MutableGeometryRect {
  type: string;
}

export type LayoutViolation =
  | { readonly type: "non-finite-geometry"; readonly itemId: string }
  | {
      readonly type: "background-padding";
      readonly groupId: string;
      readonly itemId: string;
    }
  | {
      readonly type:
        | "node-overlap"
        | "background-overlap"
        | "node-background-overlap"
        | "comment-overlap"
        | "comment-content-overlap";
      readonly itemIds: readonly [string, string];
    };

export const DEFAULT_STRUCTURED_LAYOUT_CONFIG: StructuredLayoutConfig = {
  padding: { top: 72, right: 48, bottom: 48, left: 48 },
  rootGroupGap: 24,
  commentGap: 48,
  commentLaneGap: 72,
  ungroupedGap: 24,
};

export function captureWorkflowStructure(input: {
  readonly nodes: readonly WorkflowNodeRect[];
  readonly groups: readonly GeometryRect[];
}): WorkflowStructure {
  const memberNodeIdsByGroupId: Record<string, string[]> = Object.fromEntries(
    input.groups.map((group) => [group.id, []]),
  );
  const parentByGroupId: Record<string, string> = {};
  const groupIndexById = new Map(input.groups.map((group, index) => [group.id, index]));

  for (const child of input.groups) {
    const parent = smallestContainingGroup(child, input.groups, false, true);
    if (parent) {
      parentByGroupId[child.id] = parent.id;
    }
  }

  const commentIds: string[] = [];
  const ungroupedNodeIds: string[] = [];
  const originalCommentXById: Record<string, number> = {};
  for (const node of input.nodes) {
    if (node.type === "MarkdownNote") {
      commentIds.push(node.id);
      originalCommentXById[node.id] = node.x;
      continue;
    }

    const owner = smallestContainingGroup(node, input.groups, true);
    if (owner) {
      memberNodeIdsByGroupId[owner.id]?.push(node.id);
    } else {
      ungroupedNodeIds.push(node.id);
    }
  }

  const originalGroupXById = Object.fromEntries(
    input.groups.map((group) => [group.id, group.x]),
  );
  const rootGroupIds = input.groups
    .filter((group) => parentByGroupId[group.id] === undefined)
    .sort((left, right) =>
      compareByValueThenIndex(left, right, groupIndexById, (group) => group.x),
    )
    .map((group) => group.id);

  return {
    commentIds,
    ungroupedNodeIds,
    rootGroupIds,
    parentByGroupId,
    memberNodeIdsByGroupId,
    originalGroupXById,
    originalCommentXById,
  };
}

export function normalizeStructuredLayout(
  input: StructuredLayoutInput,
  config: StructuredLayoutConfig,
): StructuredLayoutResult {
  const nodes: MutableWorkflowNodeRect[] = input.nodes.map((node) => ({ ...node }));
  const groups: MutableGeometryRect[] = input.groups.map((group) => ({ ...group }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const childGroupIdsByParentId = childGroupsByParent(input.structure);
  const fittedGroupIds = new Set<string>();

  function fitGroup(groupId: string): MutableGeometryRect | undefined {
    const group = groupById.get(groupId);
    if (!group || fittedGroupIds.has(groupId)) {
      return group;
    }
    fittedGroupIds.add(groupId);

    const childGroups = (childGroupIdsByParentId.get(groupId) ?? [])
      .map(fitGroup)
      .filter((child): child is MutableGeometryRect => child !== undefined);
    const memberNodes = (input.structure.memberNodeIdsByGroupId[groupId] ?? [])
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is MutableWorkflowNodeRect => node !== undefined);
    const contents = [...memberNodes, ...childGroups];
    if (contents.length > 0) {
      Object.assign(group, fitBounds(contents, config.padding));
    }
    return group;
  }

  for (const rootGroupId of input.structure.rootGroupIds) {
    fitGroup(rootGroupId);
  }

  const orderedRootGroups = input.structure.rootGroupIds
    .map((groupId) => groupById.get(groupId))
    .filter((group): group is MutableGeometryRect => group !== undefined)
    .sort((left, right) =>
      compareByOriginalX(left, right, input.structure.originalGroupXById),
    );

  if (orderedRootGroups.length > 0) {
    const baselineY = minimum(orderedRootGroups.map((group) => group.y));
    let cursorX = minimum(orderedRootGroups.map((group) => group.x));
    for (const group of orderedRootGroups) {
      translateSubtree(
        group.id,
        cursorX - group.x,
        baselineY - group.y,
        groupById,
        nodeById,
        childGroupIdsByParentId,
        input.structure.memberNodeIdsByGroupId,
      );
      cursorX += group.width + config.rootGroupGap;
    }
  }

  const ungroupedNodes = input.structure.ungroupedNodeIds
    .map((nodeId) => nodeById.get(nodeId))
    .filter((node): node is MutableWorkflowNodeRect => node !== undefined);
  if (orderedRootGroups.length > 0 && ungroupedNodes.length > 0) {
    const targetLeft = Math.max(
      ...orderedRootGroups.map((group) => group.x + group.width),
    ) + config.ungroupedGap;
    const targetTop = minimum(orderedRootGroups.map((group) => group.y)) + config.padding.top;
    const deltaX = targetLeft - minimum(ungroupedNodes.map((node) => node.x));
    const deltaY = targetTop - minimum(ungroupedNodes.map((node) => node.y));
    for (const node of ungroupedNodes) {
      node.x += deltaX;
      node.y += deltaY;
    }
  }

  const comments = input.structure.commentIds
    .map((id) => nodeById.get(id))
    .filter((comment): comment is MutableWorkflowNodeRect => comment !== undefined)
    .sort((left, right) =>
      compareByOriginalX(left, right, input.structure.originalCommentXById),
    );

  if (comments.length > 0) {
    const commentIds = new Set(input.structure.commentIds);
    const regularNodes = nodes.filter((node) => !commentIds.has(node.id));
    const commentsOnly = orderedRootGroups.length === 0 && regularNodes.length === 0;
    const contentLeft = commentsOnly
      ? minimum(comments.map((comment) => comment.x))
      : orderedRootGroups.length > 0
        ? minimum(orderedRootGroups.map((group) => group.x))
        : minimum(regularNodes.map((node) => node.x));
    const laneY = commentsOnly
      ? minimum(comments.map((comment) => comment.y))
      : (orderedRootGroups.length > 0
          ? minimum(orderedRootGroups.map((group) => group.y))
          : minimum(regularNodes.map((node) => node.y))) -
        config.commentLaneGap -
        Math.max(...comments.map((comment) => comment.height));
    let cursorX = contentLeft;
    for (const comment of comments) {
      comment.x = cursorX;
      comment.y = laneY;
      cursorX += comment.width + config.commentGap;
    }
  }

  return { nodes, groups };
}

export function validateStructuredLayout(
  input: StructuredLayoutInput,
  config: StructuredLayoutConfig,
): LayoutViolation[] {
  const violations: LayoutViolation[] = [];
  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const groupById = new Map(input.groups.map((group) => [group.id, group]));
  const commentIdSet = new Set(input.structure.commentIds);

  for (const item of [...input.nodes, ...input.groups]) {
    if (!hasFiniteGeometry(item)) {
      violations.push({ type: "non-finite-geometry", itemId: item.id });
    }
  }

  for (const group of input.groups) {
    for (const memberId of input.structure.memberNodeIdsByGroupId[group.id] ?? []) {
      const member = nodeById.get(memberId);
      if (member && !hasPadding(group, member, config.padding)) {
        violations.push({
          type: "background-padding",
          groupId: group.id,
          itemId: memberId,
        });
      }
    }
  }

  for (const child of input.groups) {
    const parentId = input.structure.parentByGroupId[child.id];
    const parent = parentId ? groupById.get(parentId) : undefined;
    if (parent && !hasPadding(parent, child, config.padding)) {
      violations.push({
        type: "background-padding",
        groupId: parent.id,
        itemId: child.id,
      });
    }
  }

  const regularNodes = input.nodes.filter((node) => !commentIdSet.has(node.id));
  const ownerByNodeId = ownerGroupsByNode(input.groups, input.structure);
  for (const node of regularNodes) {
    for (const group of input.groups) {
      if (!isOwnerOrAncestor(node.id, group.id, ownerByNodeId, input.structure) && overlaps(node, group)) {
        violations.push({
          type: "node-background-overlap",
          itemIds: [node.id, group.id],
        });
      }
    }
  }

  for (let index = 0; index < regularNodes.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < regularNodes.length; otherIndex += 1) {
      const left = regularNodes[index]!;
      const right = regularNodes[otherIndex]!;
      if (overlaps(left, right)) {
        violations.push({ type: "node-overlap", itemIds: [left.id, right.id] });
      }
    }
  }

  const rootGroupIdSet = new Set(input.structure.rootGroupIds);
  const rootGroups = input.groups.filter((group) => rootGroupIdSet.has(group.id));
  for (let index = 0; index < rootGroups.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < rootGroups.length; otherIndex += 1) {
      const left = rootGroups[index]!;
      const right = rootGroups[otherIndex]!;
      if (overlaps(left, right)) {
        violations.push({ type: "background-overlap", itemIds: [left.id, right.id] });
      }
    }
  }

  const comments = input.nodes.filter((node) => commentIdSet.has(node.id));
  for (let index = 0; index < comments.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < comments.length; otherIndex += 1) {
      const left = comments[index]!;
      const right = comments[otherIndex]!;
      if (overlaps(left, right)) {
        violations.push({ type: "comment-overlap", itemIds: [left.id, right.id] });
      }
    }
  }

  for (const comment of comments) {
    for (const node of regularNodes) {
      if (overlaps(comment, node)) {
        violations.push({
          type: "comment-content-overlap",
          itemIds: [comment.id, node.id],
        });
      }
    }
    for (const group of rootGroups) {
      if (overlaps(comment, group)) {
        violations.push({
          type: "comment-content-overlap",
          itemIds: [comment.id, group.id],
        });
      }
    }
  }

  return violations;
}

function hasFiniteGeometry(rect: GeometryRect): boolean {
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite);
}

function hasPadding(
  container: GeometryRect,
  item: GeometryRect,
  padding: StructuredLayoutConfig["padding"],
): boolean {
  return (
    item.x - container.x >= padding.left &&
    item.y - container.y >= padding.top &&
    container.x + container.width - (item.x + item.width) >= padding.right &&
    container.y + container.height - (item.y + item.height) >= padding.bottom
  );
}

function ownerGroupsByNode(
  groups: readonly GeometryRect[],
  structure: WorkflowStructure,
): ReadonlyMap<string, string> {
  const ownerByNodeId = new Map<string, string>();
  for (const group of groups) {
    for (const memberId of structure.memberNodeIdsByGroupId[group.id] ?? []) {
      if (!ownerByNodeId.has(memberId)) {
        ownerByNodeId.set(memberId, group.id);
      }
    }
  }
  return ownerByNodeId;
}

function isOwnerOrAncestor(
  nodeId: string,
  groupId: string,
  ownerByNodeId: ReadonlyMap<string, string>,
  structure: WorkflowStructure,
): boolean {
  const visited = new Set<string>();
  let currentGroupId = ownerByNodeId.get(nodeId);
  while (currentGroupId && !visited.has(currentGroupId)) {
    if (currentGroupId === groupId) {
      return true;
    }
    visited.add(currentGroupId);
    currentGroupId = structure.parentByGroupId[currentGroupId];
  }
  return false;
}

function overlaps(left: GeometryRect, right: GeometryRect): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function fitBounds(
  items: readonly GeometryRect[],
  padding: StructuredLayoutConfig["padding"],
): Omit<GeometryRect, "id"> {
  const left = minimum(items.map((item) => item.x));
  const top = minimum(items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.width));
  const bottom = Math.max(...items.map((item) => item.y + item.height));
  return {
    x: left - padding.left,
    y: top - padding.top,
    width: right - left + padding.left + padding.right,
    height: bottom - top + padding.top + padding.bottom,
  };
}

function childGroupsByParent(
  structure: WorkflowStructure,
): ReadonlyMap<string, readonly string[]> {
  const childrenByParent = new Map<string, string[]>();
  for (const [childId, parentId] of Object.entries(structure.parentByGroupId)) {
    const children = childrenByParent.get(parentId) ?? [];
    children.push(childId);
    childrenByParent.set(parentId, children);
  }
  return childrenByParent;
}

function translateSubtree(
  rootGroupId: string,
  deltaX: number,
  deltaY: number,
  groupById: ReadonlyMap<string, MutableGeometryRect>,
  nodeById: ReadonlyMap<string, MutableWorkflowNodeRect>,
  childGroupIdsByParentId: ReadonlyMap<string, readonly string[]>,
  memberNodeIdsByGroupId: WorkflowStructure["memberNodeIdsByGroupId"],
): void {
  const pending = [rootGroupId];
  while (pending.length > 0) {
    const groupId = pending.pop();
    if (!groupId) {
      continue;
    }
    const group = groupById.get(groupId);
    if (group) {
      group.x += deltaX;
      group.y += deltaY;
    }
    for (const nodeId of memberNodeIdsByGroupId[groupId] ?? []) {
      const node = nodeById.get(nodeId);
      if (node) {
        node.x += deltaX;
        node.y += deltaY;
      }
    }
    pending.push(...(childGroupIdsByParentId.get(groupId) ?? []));
  }
}

function smallestContainingGroup(
  item: GeometryRect,
  groups: readonly GeometryRect[],
  byCenter = false,
  requireLargerArea = false,
): GeometryRect | undefined {
  let candidate: GeometryRect | undefined;
  let candidateArea = Number.POSITIVE_INFINITY;
  for (const group of groups) {
    if (group.id === item.id || !(byCenter ? containsCenter(group, item) : contains(group, item))) {
      continue;
    }
    const groupArea = area(group);
    if (requireLargerArea && groupArea <= area(item)) {
      continue;
    }
    if (groupArea < candidateArea) {
      candidate = group;
      candidateArea = groupArea;
    }
  }
  return candidate;
}

function contains(outer: GeometryRect, inner: GeometryRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function containsCenter(outer: GeometryRect, inner: GeometryRect): boolean {
  const centerX = inner.x + inner.width / 2;
  const centerY = inner.y + inner.height / 2;
  return (
    centerX >= outer.x &&
    centerX <= outer.x + outer.width &&
    centerY >= outer.y &&
    centerY <= outer.y + outer.height
  );
}

function area(rect: GeometryRect): number {
  return rect.width * rect.height;
}

function minimum(values: readonly number[]): number {
  return Math.min(...values);
}

function compareByOriginalX(
  left: GeometryRect,
  right: GeometryRect,
  originalXById: Readonly<Record<string, number>>,
): number {
  const delta = (originalXById[left.id] ?? left.x) - (originalXById[right.id] ?? right.x);
  return delta === 0 ? 0 : delta;
}

function compareByValueThenIndex(
  left: GeometryRect,
  right: GeometryRect,
  indexById: ReadonlyMap<string, number>,
  value: (group: GeometryRect) => number,
): number {
  const delta = value(left) - value(right);
  if (delta !== 0) {
    return delta;
  }
  return (indexById.get(left.id) ?? 0) - (indexById.get(right.id) ?? 0);
}
