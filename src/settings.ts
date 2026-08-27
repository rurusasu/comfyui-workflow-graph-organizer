import {
  DEFAULT_STRUCTURED_LAYOUT_CONFIG,
  type StructuredLayoutConfig,
} from "./structured-layout";

export const EXTENSION_NAME = "rurusasu.workflow-graph-organizer";
export const SETTINGS_PREFIX = "Workflow Graph Organizer";
export const COMMAND_PREFIX = "workflow-graph-organizer";
export const UPSTREAM_EXTENSION_NAME = "comfy-node-organizer";
export const UPSTREAM_COMMAND_PREFIX = "node-organizer";
export const REPOSITORY_URL =
  "https://github.com/rurusasu/comfyui-workflow-graph-organizer";
export const CURRENT_VERSION = "1.0.1";

export const DEFAULT_ALGORITHM_OPTIONS = [
  "sugiyama",
  "horizontal",
  "vertical",
] as const;

export type DefaultAlgorithmName =
  (typeof DEFAULT_ALGORITHM_OPTIONS)[number];

export const SETTING_IDS = {
  VERSION: `${SETTINGS_PREFIX}.About`,
  KEYBINDINGS: `${SETTINGS_PREFIX}.Keybindings`,
  DEFAULT_ALGORITHM: `${SETTINGS_PREFIX}.Default Algorithm`,
  HORIZONTAL_GAP: `${SETTINGS_PREFIX}.Horizontal Gap`,
  VERTICAL_GAP: `${SETTINGS_PREFIX}.Vertical Gap`,
  GROUP_PADDING: `${SETTINGS_PREFIX}.Group Padding`,
  DISCONNECTED_GAP: `${SETTINGS_PREFIX}.Disconnected Gap`,
  BACKGROUND_PADDING_TOP: `${SETTINGS_PREFIX}.Background Padding Top`,
  BACKGROUND_PADDING_RIGHT: `${SETTINGS_PREFIX}.Background Padding Right`,
  BACKGROUND_PADDING_BOTTOM: `${SETTINGS_PREFIX}.Background Padding Bottom`,
  BACKGROUND_PADDING_LEFT: `${SETTINGS_PREFIX}.Background Padding Left`,
  ROOT_GROUP_GAP: `${SETTINGS_PREFIX}.Root Background Gap`,
  COMMENT_GAP: `${SETTINGS_PREFIX}.Comment Gap`,
  COMMENT_LANE_GAP: `${SETTINGS_PREFIX}.Comment Lane Gap`,
  UNGROUPED_CLUSTER_GAP: `${SETTINGS_PREFIX}.Ungrouped Cluster Gap`,
  FIT_TO_VIEW: `${SETTINGS_PREFIX}.Fit to View`,
  DEBUG_LOGGING: `${SETTINGS_PREFIX}.Debug Logging`,
} as const;

export { DEFAULT_STRUCTURED_LAYOUT_CONFIG };

type SettingReader = <T = unknown>(id: string) => T | undefined;

/**
 * Read whole-workflow settings defensively. Persisted settings are user input:
 * each invalid field independently falls back to its documented default.
 */
export function readStructuredLayoutConfig(
  get: SettingReader | undefined,
): StructuredLayoutConfig {
  const read = (id: string, fallback: number): number => {
    const value = get?.<unknown>(id);
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? value
      : fallback;
  };

  return {
    padding: {
      top: read(
        SETTING_IDS.BACKGROUND_PADDING_TOP,
        DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.top,
      ),
      right: read(
        SETTING_IDS.BACKGROUND_PADDING_RIGHT,
        DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.right,
      ),
      bottom: read(
        SETTING_IDS.BACKGROUND_PADDING_BOTTOM,
        DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.bottom,
      ),
      left: read(
        SETTING_IDS.BACKGROUND_PADDING_LEFT,
        DEFAULT_STRUCTURED_LAYOUT_CONFIG.padding.left,
      ),
    },
    rootGroupGap: read(
      SETTING_IDS.ROOT_GROUP_GAP,
      DEFAULT_STRUCTURED_LAYOUT_CONFIG.rootGroupGap,
    ),
    commentGap: read(
      SETTING_IDS.COMMENT_GAP,
      DEFAULT_STRUCTURED_LAYOUT_CONFIG.commentGap,
    ),
    commentLaneGap: read(
      SETTING_IDS.COMMENT_LANE_GAP,
      DEFAULT_STRUCTURED_LAYOUT_CONFIG.commentLaneGap,
    ),
    ungroupedGap: read(
      SETTING_IDS.UNGROUPED_CLUSTER_GAP,
      DEFAULT_STRUCTURED_LAYOUT_CONFIG.ungroupedGap,
    ),
  };
}
