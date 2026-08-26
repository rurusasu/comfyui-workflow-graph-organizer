/**
 * ComfyUI Workflow Graph Organizer — extension entry point.
 *
 * Registers commands, keybindings, settings, and context menu items
 * that wire the pure layout framework into ComfyUI's runtime.
 */

import type { ComfyApp } from "@comfyorg/comfyui-frontend-types";
import {
  createLayoutAlgorithm,
  type LayoutAlgorithmName,
} from "./layout/algorithm-factory";
import {
  SETTING_IDS,
  COMMAND_PREFIX,
  EXTENSION_NAME,
  SETTINGS_PREFIX,
  REPOSITORY_URL,
  CURRENT_VERSION,
  DEFAULT_ALGORITHM_OPTIONS,
  DEFAULT_STRUCTURED_LAYOUT_CONFIG,
  readStructuredLayoutConfig,
  UPSTREAM_COMMAND_PREFIX,
  UPSTREAM_EXTENSION_NAME,
} from "./settings";
import type { DefaultAlgorithmName } from "./settings";
import { debugLog } from "./debug";
import {
  extractLayoutInput,
  extractGroupLayoutInput,
  applyLayoutOutput,
  anchorSelectedGroupLayoutResult,
} from "./adapter";
import type { GraphLike } from "./adapter";
import { layoutWithGroups } from "./layout/framework";
import type { LayoutAlgorithm, FrameworkConfig } from "./layout/types";
import { DEFAULT_FRAMEWORK_CONFIG } from "./layout/types";
import { isGroup } from "./utils";
import {
  getCurrentGraph,
  getSelectedGroups,
  runWholeWorkflowLayout,
  snapshotGraphGeometry,
  type AppLike,
} from "./runtime";

// Declare the global app variable injected by ComfyUI's runtime loader
declare global {
  const app: ComfyApp;
}

const DEFAULT_ALGORITHM_NAME: DefaultAlgorithmName = "sugiyama";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultAlgorithmName(): DefaultAlgorithmName {
  const raw = (app.extensionManager?.setting?.get?.<string>(
    SETTING_IDS.DEFAULT_ALGORITHM,
  ) ?? DEFAULT_ALGORITHM_NAME) as string;

  return DEFAULT_ALGORITHM_OPTIONS.includes(raw as DefaultAlgorithmName)
    ? (raw as DefaultAlgorithmName)
    : DEFAULT_ALGORITHM_NAME;
}

export function createConfiguredDefaultAlgorithm(
  algorithmName: DefaultAlgorithmName,
  config: Partial<FrameworkConfig>,
): LayoutAlgorithm {
  return createLayoutAlgorithm(algorithmName as LayoutAlgorithmName, {
    horizontalGap:
      config.horizontalGap ?? DEFAULT_FRAMEWORK_CONFIG.horizontalGap,
    verticalGap:
      config.verticalGap ?? DEFAULT_FRAMEWORK_CONFIG.verticalGap,
  });
}

function getDefaultAlgorithm(config: Partial<FrameworkConfig>): LayoutAlgorithm {
  return createConfiguredDefaultAlgorithm(getDefaultAlgorithmName(), config);
}

function getFrameworkConfig(): Partial<FrameworkConfig> {
  const get = app.extensionManager?.setting?.get;
  if (!get) return {};
  return {
    horizontalGap:
      get<number | undefined>(SETTING_IDS.HORIZONTAL_GAP as never) ??
      DEFAULT_FRAMEWORK_CONFIG.horizontalGap,
    verticalGap:
      get<number | undefined>(SETTING_IDS.VERTICAL_GAP as never) ??
      DEFAULT_FRAMEWORK_CONFIG.verticalGap,
    groupPadding:
      get<number | undefined>(SETTING_IDS.GROUP_PADDING as never) ??
      DEFAULT_FRAMEWORK_CONFIG.groupPadding,
    disconnectedGap:
      get<number | undefined>(SETTING_IDS.DISCONNECTED_GAP as never) ??
      DEFAULT_FRAMEWORK_CONFIG.disconnectedGap,
  };
}

function getFitToView(): boolean {
  return (
    app.extensionManager?.setting?.get?.<boolean>(
      SETTING_IDS.FIT_TO_VIEW as never,
    ) ?? false
  );
}

function getStructuredLayoutConfig() {
  return readStructuredLayoutConfig(
    app.extensionManager?.setting?.get?.bind(app.extensionManager.setting),
  );
}

type ToastSeverity = "success" | "warn" | "error";

function showToast(severity: ToastSeverity, summary: string, detail: string): void {
  app.extensionManager?.toast?.add({ severity, summary, detail });
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function upstreamOrganizerIsRegistered(): boolean {
  const appRecord = app as unknown as {
    extensions?: Iterable<{ name?: unknown }>;
    extensionManager?: {
      extensions?: Iterable<{ name?: unknown }>;
      command?: {
        commands?:
          | Iterable<{ id?: unknown }>
          | ReadonlyMap<unknown, { id?: unknown }>;
      };
    };
  };
  const extensions = [
    ...(appRecord.extensions ?? []),
    ...(appRecord.extensionManager?.extensions ?? []),
  ];
  if (extensions.some((extension) => extension.name === UPSTREAM_EXTENSION_NAME)) {
    return true;
  }

  const commands = appRecord.extensionManager?.command?.commands;
  if (!commands) return false;
  if (commands instanceof Map) {
    return Array.from(commands.values()).some(
      (command) => command.id === `${UPSTREAM_COMMAND_PREFIX}.organize-workflow`,
    );
  }
  return Array.from(commands as Iterable<{ id?: unknown }>).some(
    (command) => command.id === `${UPSTREAM_COMMAND_PREFIX}.organize-workflow`,
  );
}

function warnAboutUpstreamOrganizer(): void {
  if (!upstreamOrganizerIsRegistered()) return;
  showToast(
    "warn",
    "Unsupported organizer co-installation",
    "This extension replaces ComfyUI Node Organizer. Please disable or remove ComfyUI Node Organizer, then restart ComfyUI.",
  );
}

function fitCurrentGraphToView(graph: GraphLike): void {
  if (!getFitToView()) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const geometry = snapshotGraphGeometry(graph);
      const rects = [...geometry.nodes, ...geometry.groups];
      if (rects.length === 0) return;

      const minX = Math.min(...rects.map((rect) => rect.x));
      const minY = Math.min(...rects.map((rect) => rect.y));
      const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
      const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
      if (![minX, minY, maxX, maxY].every(Number.isFinite)) return;

      const canvas = app.canvas as {
        animateToBounds?: (
          bounds: readonly [number, number, number, number],
          opts?: { zoom?: number },
        ) => void;
      } | null;
      canvas?.animateToBounds?.([minX, minY, maxX - minX, maxY - minY], {
        zoom: 0.9,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Core actions
// ---------------------------------------------------------------------------

/** Run the upstream-derived node engine directly; it is not a registered command. */
function runNodeLayoutEngine(
  graph: GraphLike,
  options: { readonly markDirty?: boolean } = {},
): void {
  const config = getFrameworkConfig();
  const algorithm = getDefaultAlgorithm(config);
  const start = performance.now();
  debugLog(`Starting node layout with ${algorithm.name}...`);
  const { nodes, edges, groups } = extractLayoutInput(graph);
  const result = layoutWithGroups(nodes, edges, groups, algorithm, config);
  applyLayoutOutput(graph, result, options);
  debugLog(
    `Organized ${nodes.length} nodes in ${(performance.now() - start).toFixed(1)}ms with ${algorithm.name}`,
  );
}

function runSelectedGroupLayout(graph: GraphLike, selectedGroupIds: Set<number>): void {
  const config = getFrameworkConfig();
  const algorithm = getDefaultAlgorithm(config);
  const { nodes, edges, groups } = extractGroupLayoutInput(graph, selectedGroupIds);
  const result = anchorSelectedGroupLayoutResult(
    graph,
    groups,
    selectedGroupIds,
    layoutWithGroups(nodes, edges, groups, algorithm, config),
  );
  applyLayoutOutput(graph, result);
}

/** Organize the full workflow atomically, including backgrounds and comments. */
function organizeWorkflow(): void {
  const graph = getCurrentGraph(app as AppLike<GraphLike>);
  if (!graph) {
    showToast("warn", "No active workflow", "Open a workflow before organizing it.");
    return;
  }

  warnAboutUpstreamOrganizer();
  try {
    const summary = runWholeWorkflowLayout(
      graph,
      () => runNodeLayoutEngine(graph, { markDirty: false }),
      getStructuredLayoutConfig(),
    );
    fitCurrentGraphToView(graph);

    if (summary.engineChanged) {
      const nodes = countLabel(summary.nodes, "node");
      const backgrounds = countLabel(summary.groups, "background");
      const comments = countLabel(summary.comments, "comment");
      showToast(
        "success",
        "Workflow organized",
        `Organized ${nodes}, ${backgrounds}, and ${comments}.`,
      );
    } else {
      showToast(
        "warn",
        "Workflow normalized",
        "The layout engine made no observable geometry change; backgrounds and comments were normalized.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${COMMAND_PREFIX}] whole-workflow layout failed: ${message}`);
    showToast("error", "Workflow organization failed", message);
    throw error;
  }
}

/** Organize nodes only, preserving the narrower upstream behavior. */
function organizeNodesOnly(): void {
  const graph = getCurrentGraph(app as AppLike<GraphLike>);
  if (!graph) {
    showToast("warn", "No active workflow", "Open a workflow before organizing nodes.");
    return;
  }
  warnAboutUpstreamOrganizer();
  try {
    runNodeLayoutEngine(graph);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${COMMAND_PREFIX}] node-only layout failed: ${message}`);
    showToast("error", "Node organization failed", message);
    throw error;
  }
}

/** Organize nodes within currently selected groups. */
function organizeSelectedGroups(): void {
  const selectedGroups = getSelectedGroups(app.canvas);
  if (selectedGroups.length === 0) {
    console.warn(`[${COMMAND_PREFIX}] No groups selected`);
    return;
  }
  const graph = getCurrentGraph(app as AppLike<GraphLike>);
  if (!graph) {
    showToast("warn", "No active workflow", "Open a workflow before organizing groups.");
    return;
  }
  warnAboutUpstreamOrganizer();
  try {
    runSelectedGroupLayout(graph, new Set(selectedGroups.map((group) => group.id)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${COMMAND_PREFIX}] group layout failed: ${message}`);
    showToast("error", "Group organization failed", message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Extension registration
// ---------------------------------------------------------------------------

app.registerExtension({
  name: EXTENSION_NAME,

  settings: [
    // --- About (sortOrder 50 — highest = first in ComfyUI's descending sort) ---
    {
      id: SETTING_IDS.VERSION as never,
      name: `Version ${CURRENT_VERSION}`,
      category: [SETTINGS_PREFIX, "About", "Version"],
      sortOrder: 50,
      type: (() => {
        const span = document.createElement("span");
        const link = document.createElement("a");
        link.href = REPOSITORY_URL;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.paddingRight = "12px";
        link.textContent = "Homepage";
        span.appendChild(link);
        return span;
      }) as never,
      defaultValue: undefined as never,
    },
    // --- Layout (sortOrder 40–44) ---
    {
      id: SETTING_IDS.DEFAULT_ALGORITHM as never,
      name: "Default Layout Algorithm",
      category: [SETTINGS_PREFIX, "Layout", "Algorithm"],
      sortOrder: 44,
      type: "combo",
      tooltip:
        "Default algorithm for organize commands when a group title token does not override it",
      options: DEFAULT_ALGORITHM_OPTIONS.map((value) => ({
        text: value[0].toUpperCase() + value.slice(1),
        value,
      })),
      defaultValue: DEFAULT_ALGORITHM_NAME,
    },
    {
      id: SETTING_IDS.HORIZONTAL_GAP as never,
      name: "Horizontal Gap",
      category: [SETTINGS_PREFIX, "Layout", "Horizontal Gap"],
      sortOrder: 43,
      type: "slider",
      tooltip: `Space between nodes left-to-right in pixels. Default: ${DEFAULT_FRAMEWORK_CONFIG.horizontalGap}`,
      attrs: { min: 20, max: 300, step: 10 },
      defaultValue: DEFAULT_FRAMEWORK_CONFIG.horizontalGap,
    },
    {
      id: SETTING_IDS.VERTICAL_GAP as never,
      name: "Vertical Gap",
      category: [SETTINGS_PREFIX, "Layout", "Vertical Gap"],
      sortOrder: 42,
      type: "slider",
      tooltip: `Space between nodes top-to-bottom in pixels. Default: ${DEFAULT_FRAMEWORK_CONFIG.verticalGap}`,
      attrs: { min: 10, max: 150, step: 10 },
      defaultValue: DEFAULT_FRAMEWORK_CONFIG.verticalGap,
    },
    {
      id: SETTING_IDS.GROUP_PADDING as never,
      name: "Group Padding",
      category: [SETTINGS_PREFIX, "Layout", "Group Padding"],
      sortOrder: 41,
      type: "slider",
      tooltip: `Inner padding of group boxes in pixels. Default: ${DEFAULT_FRAMEWORK_CONFIG.groupPadding}`,
      attrs: { min: 10, max: 100, step: 5 },
      defaultValue: DEFAULT_FRAMEWORK_CONFIG.groupPadding,
    },
    {
      id: SETTING_IDS.DISCONNECTED_GAP as never,
      name: "Disconnected Node Gap",
      category: [SETTINGS_PREFIX, "Layout", "Disconnected Gap"],
      sortOrder: 40,
      type: "slider",
      tooltip: `Gap between disconnected nodes (e.g. notes) and the main graph in pixels. Default: ${DEFAULT_FRAMEWORK_CONFIG.disconnectedGap}`,
      attrs: { min: 50, max: 400, step: 10 },
      defaultValue: DEFAULT_FRAMEWORK_CONFIG.disconnectedGap,
    },
    // --- Whole Workflow (sortOrder 32–39) ---
    {
      id: SETTING_IDS.BACKGROUND_PADDING_TOP as never,
      name: "Background Padding Top",
      category: [SETTINGS_PREFIX, "Whole Workflow", "Background Padding Top"],
      sortOrder: 39,
      type: "number",
      tooltip: `Top padding inside backgrounds in pixels. Default: ${DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.top}`,
      attrs: { min: 0, step: 1 },
      defaultValue: DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.top,
    },
    {
      id: SETTING_IDS.BACKGROUND_PADDING_RIGHT as never,
      name: "Background Padding Right",
      category: [SETTINGS_PREFIX, "Whole Workflow", "Background Padding Right"],
      sortOrder: 38,
      type: "number",
      tooltip: `Right padding inside backgrounds in pixels. Default: ${DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.right}`,
      attrs: { min: 0, step: 1 },
      defaultValue: DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.right,
    },
    {
      id: SETTING_IDS.BACKGROUND_PADDING_BOTTOM as never,
      name: "Background Padding Bottom",
      category: [SETTINGS_PREFIX, "Whole Workflow", "Background Padding Bottom"],
      sortOrder: 37,
      type: "number",
      tooltip: `Bottom padding inside backgrounds in pixels. Default: ${DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.bottom}`,
      attrs: { min: 0, step: 1 },
      defaultValue: DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.bottom,
    },
    {
      id: SETTING_IDS.BACKGROUND_PADDING_LEFT as never,
      name: "Background Padding Left",
      category: [SETTINGS_PREFIX, "Whole Workflow", "Background Padding Left"],
      sortOrder: 36,
      type: "number",
      tooltip: `Left padding inside backgrounds in pixels. Default: ${DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.left}`,
      attrs: { min: 0, step: 1 },
      defaultValue: DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.left,
    },
    {
      id: SETTING_IDS.ROOT_GROUP_GAP as never,
      name: "Root Background Gap",
      category: [SETTINGS_PREFIX, "Whole Workflow", "Root Background Gap"],
      sortOrder: 35,
      type: "number",
      tooltip: `Gap between root backgrounds in pixels. Default: ${DEFAULT_STRUCTURED_LAYOUT_CONFIG.rootGroupGap}`,
      attrs: { min: 0, step: 1 },
      defaultValue: DEFAULT_STRUCTURED_LAYOUT_CONFIG.rootGroupGap,
    },
    {
      id: SETTING_IDS.COMMENT_GAP as never,
      name: "Comment Gap",
      category: [SETTINGS_PREFIX, "Whole Workflow", "Comment Gap"],
      sortOrder: 34,
      type: "number",
      tooltip: `Gap between comments in pixels. Default: ${DEFAULT_STRUCTURED_LAYOUT_CONFIG.commentGap}`,
      attrs: { min: 0, step: 1 },
      defaultValue: DEFAULT_STRUCTURED_LAYOUT_CONFIG.commentGap,
    },
    {
      id: SETTING_IDS.COMMENT_LANE_GAP as never,
      name: "Comment Lane Gap",
      category: [SETTINGS_PREFIX, "Whole Workflow", "Comment Lane Gap"],
      sortOrder: 33,
      type: "number",
      tooltip: `Gap between the comment lane and graph content in pixels. Default: ${DEFAULT_STRUCTURED_LAYOUT_CONFIG.commentLaneGap}`,
      attrs: { min: 0, step: 1 },
      defaultValue: DEFAULT_STRUCTURED_LAYOUT_CONFIG.commentLaneGap,
    },
    {
      id: SETTING_IDS.UNGROUPED_CLUSTER_GAP as never,
      name: "Ungrouped Cluster Gap",
      category: [SETTINGS_PREFIX, "Whole Workflow", "Ungrouped Cluster Gap"],
      sortOrder: 32,
      type: "number",
      tooltip: `Gap between root backgrounds and ungrouped nodes in pixels. Default: ${DEFAULT_STRUCTURED_LAYOUT_CONFIG.ungroupedGap}`,
      attrs: { min: 0, step: 1 },
      defaultValue: DEFAULT_STRUCTURED_LAYOUT_CONFIG.ungroupedGap,
    },
    // --- Behavior (sortOrder 30) ---
    {
      id: SETTING_IDS.FIT_TO_VIEW as never,
      name: "Fit to View After Organize",
      category: [SETTINGS_PREFIX, "Behavior", "Fit to View"],
      sortOrder: 30,
      type: "boolean",
      tooltip:
        "Automatically zoom to fit the graph after organizing the full workflow. Does not apply to selected-group organize.",
      defaultValue: false,
    },
    // --- Keybindings (sortOrder 20) ---
    {
      id: SETTING_IDS.KEYBINDINGS as never,
      name: "Keyboard Shortcuts",
      category: [SETTINGS_PREFIX, "Keybindings", "Info"],
      sortOrder: 20,
      type: (() => {
        const span = document.createElement("span");
        span.style.color = "var(--p-text-muted-color, #999)";
        span.textContent =
          "Default: Shift+O (Organize Workflow). Edit shortcuts in Settings > Keybinding.";
        return span;
      }) as never,
      defaultValue: undefined as never,
    },
    // --- Advanced (sortOrder 10 — lowest = last in ComfyUI's descending sort) ---
    {
      id: SETTING_IDS.DEBUG_LOGGING as never,
      name: "Enable Debug Logging",
      category: [SETTINGS_PREFIX, "Advanced", "Debug Logging"],
      sortOrder: 10,
      type: "boolean",
      tooltip:
        "Show detailed debug logs in browser console during organization",
      defaultValue: false,
    },
  ],

  commands: [
    {
      id: `${COMMAND_PREFIX}.organize`,
      function: organizeWorkflow,
      label: "Organize Workflow",
      icon: "pi pi-sitemap",
      tooltip: "Organize the complete workflow, including backgrounds and comments",
    },
    {
      id: `${COMMAND_PREFIX}.organize-nodes-only`,
      function: organizeNodesOnly,
      label: "Organize Nodes Only",
      icon: "pi pi-sitemap",
      tooltip: "Organize nodes without whole-workflow normalization",
    },
    {
      id: `${COMMAND_PREFIX}.organize-groups`,
      function: organizeSelectedGroups,
      label: "Organize Group",
      icon: "pi pi-objects-column",
      tooltip: "Organize nodes within selected groups",
    },
  ],

  keybindings: [
    {
      commandId: `${COMMAND_PREFIX}.organize`,
      combo: { key: "o", shift: true },
    },
  ],

  menuCommands: [
    {
      path: ["Extensions", "Workflow Graph Organizer"],
      commands: [
        `${COMMAND_PREFIX}.organize`,
        `${COMMAND_PREFIX}.organize-nodes-only`,
        `${COMMAND_PREFIX}.organize-groups`,
      ],
    },
  ],

  actionBarButtons: [
    {
      label: "Organize Workflow",
      icon: "pi pi-sitemap",
      tooltip: "Organize the complete workflow",
      onClick: organizeWorkflow,
    },
  ],

  getCanvasMenuItems() {
    const items: Array<{
      content: string;
      callback: () => void;
    } | null> = [
      null, // separator
      {
        content: "Organize Workflow",
        callback: organizeWorkflow,
      },
      {
        content: "Organize Nodes Only",
        callback: organizeNodesOnly,
      },
    ];

    const selectedGroups = getSelectedGroups(app.canvas);
    if (selectedGroups.length === 1) {
      items.push({
        content: "Organize Group",
        callback: organizeSelectedGroups,
      });
    } else if (selectedGroups.length > 1) {
      items.push({
        content: `Organize ${selectedGroups.length} Groups`,
        callback: organizeSelectedGroups,
      });
    }

    items.push(null); // separator
    return items;
  },

  getSelectionToolboxCommands(selectedItem) {
    if (isGroup(selectedItem)) {
      return [`${COMMAND_PREFIX}.organize-groups`];
    }
    return [];
  },
});
