export function extractPinnedWorkflowTemplatesRequirement(
  requirementsText: string,
): string {
  const requirement = requirementsText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("comfyui-workflow-templates=="));

  if (!requirement) {
    throw new Error(
      "Pinned ComfyUI checkout does not declare comfyui-workflow-templates",
    );
  }

  return requirement;
}

/**
 * Keep the dedicated E2E instance offline. ComfyUI Manager otherwise fetches
 * its registry during every parallel workflow load, which can terminate the
 * shared test server when the network fails.
 */
export function setComfyManagerNetworkMode(
  configText: string,
  mode: "local" | "public" = "local",
): string {
  const normalized = configText.replace(/\r\n/g, "\n");
  if (/^network_mode\s*=.*$/m.test(normalized)) {
    return normalized.replace(/^network_mode\s*=.*$/m, `network_mode = ${mode}`);
  }

  const suffix = normalized.endsWith("\n") ? "" : "\n";
  return `${normalized}${suffix}network_mode = ${mode}\n`;
}
