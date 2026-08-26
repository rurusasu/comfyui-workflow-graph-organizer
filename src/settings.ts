export const EXTENSION_NAME = "rurusasu.workflow-graph-organizer";
export const SETTINGS_PREFIX = "Workflow Graph Organizer";
export const COMMAND_PREFIX = "workflow-graph-organizer";
export const UPSTREAM_EXTENSION_NAME = "comfy-node-organizer";
export const UPSTREAM_COMMAND_PREFIX = "node-organizer";
export const REPOSITORY_URL =
  "https://github.com/rurusasu/comfyui-workflow-graph-organizer";
export const CURRENT_VERSION = "1.0.0";

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
  FIT_TO_VIEW: `${SETTINGS_PREFIX}.Fit to View`,
  DEBUG_LOGGING: `${SETTINGS_PREFIX}.Debug Logging`,
} as const;
