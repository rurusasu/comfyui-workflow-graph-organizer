import { expect, test } from "@playwright/test";
import { loadFixture } from "./fixtures";
import { loadWorkflow, waitForComfyUI } from "./helpers";

test.describe("replacement warning", () => {
  test("test-only upstream registration warns without executing the upstream command", async ({ page }) => {
    await page.goto("/");
    await waitForComfyUI(page);
    await loadWorkflow(page, loadFixture("whole-workflow-layout"));

    const result = await page.evaluate(() => {
      const appObj = (window as unknown as Record<string, unknown>).app as Record<string, unknown>;
      const manager = appObj.extensionManager as Record<string, unknown>;
      const command = manager.command as {
        commands: Array<{ id: string }>;
        execute: (id: string) => void;
      };
      const toast = manager.toast as {
        add: (message: { severity?: string; detail?: string }) => void;
      };
      const upstream = { id: "node-organizer.organize-workflow" };
      const messages: Array<{ severity?: string; detail?: string }> = [];
      const originalAdd = toast.add.bind(toast);
      toast.add = (message) => {
        messages.push(message);
        originalAdd(message);
      };
      command.commands.push(upstream);
      try {
        command.execute("workflow-graph-organizer.organize");
        return { messages, hasUpstreamCommand: command.commands.includes(upstream) };
      } finally {
        command.commands.splice(command.commands.indexOf(upstream), 1);
        toast.add = originalAdd;
      }
    });

    expect(result.hasUpstreamCommand).toBe(true);
    expect(result.messages).toContainEqual(
      expect.objectContaining({
        severity: "warn",
        detail: expect.stringContaining("disable or remove ComfyUI Node Organizer"),
      }),
    );
  });
});
