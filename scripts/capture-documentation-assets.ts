import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { e2eConfig } from "../e2e.config.ts";
import {
  assertCaptureOrigin,
  withExclusiveCaptureRuntime,
} from "./capture-documentation-assets-lifecycle.ts";
import globalSetup from "../tests/e2e/global-setup.ts";
import globalTeardown from "../tests/e2e/global-teardown.ts";

const fixture = JSON.parse(
  readFileSync("tests/fixtures/whole-workflow-layout.json", "utf8"),
) as Record<string, unknown>;

async function fitGraph(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: /Fit View/ }).click({ force: true });
  await page.waitForTimeout(750);
}

async function prepareStableCanvas(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    const canvas = (window as unknown as {
      app: {
        canvas?: {
          show_fps?: boolean;
          show_info?: boolean;
          setDirty?: (fg: boolean, bg: boolean) => void;
          draw?: (fg: boolean, bg: boolean) => void;
        };
      };
    }).app.canvas;
    if (!canvas) throw new Error("ComfyUI graph canvas is unavailable");
    canvas.show_fps = false;
    canvas.show_info = false;
    canvas.setDirty?.(true, true);
    canvas.draw?.(true, true);
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolveFrame) =>
        requestAnimationFrame(() => resolveFrame()),
      ),
  );
}

async function hideTransientNotifications(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll("p-toast, .p-toast, .p-toast-message, [role=alert]")
      .forEach((element) => {
        (element as HTMLElement).style.visibility = "hidden";
      });
  });
}

async function restrictCaptureRequests(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.route("**/*", async (route) => {
    const request = route.request();
    try {
      assertCaptureOrigin(request.url());
    } catch {
      await route.abort("blockedbyclient");
      return;
    }
    if (request.redirectedFrom()) {
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
}

async function main(): Promise<void> {
  const pidFile = resolve(e2eConfig.testComfyDir, "comfy.pid");
  await withExclusiveCaptureRuntime(
    {
      setup: globalSetup,
      teardown: globalTeardown,
      readPidMarker: () =>
        existsSync(pidFile) ? readFileSync(pidFile, "utf8") : undefined,
    },
    async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({
          viewport: { width: 1600, height: 1000 },
        });
        await restrictCaptureRequests(page);
        await page.goto(e2eConfig.comfyUrl, {
          waitUntil: "domcontentloaded",
        });
        assertCaptureOrigin(page.url());
        await page.waitForFunction(
          () =>
            !!(window as unknown as { app?: { extensionManager?: unknown } })
              .app?.extensionManager,
          { timeout: e2eConfig.timeouts.pageLoad },
        );
        await page.evaluate(async (workflow) => {
          const app = (window as unknown as {
            app: { loadGraphData: (data: unknown) => Promise<void> };
          }).app;
          await app.loadGraphData(workflow);
        }, fixture);
        await page.waitForTimeout(1_000);
        await fitGraph(page);
        await prepareStableCanvas(page);
        await hideTransientNotifications(page);
        await page.locator("#graph-canvas").screenshot({
          path: "assets/workflow-graph-before.png",
        });

        await page.evaluate(async () => {
          const app = (window as unknown as {
            app: {
              extensionManager: {
                command: { execute: (id: string) => void | Promise<void> };
              };
            };
          }).app;
          await Promise.resolve(
            app.extensionManager.command.execute(
              "workflow-graph-organizer.organize",
            ),
          );
        });
        await page.waitForTimeout(1_000);
        await fitGraph(page);
        await prepareStableCanvas(page);
        await hideTransientNotifications(page);
        await page.locator("#graph-canvas").screenshot({
          path: "assets/workflow-graph-after.png",
        });
        console.log("Captured assets/workflow-graph-before.png");
        console.log("Captured assets/workflow-graph-after.png");
      } finally {
        await browser.close();
      }
    },
  );
}

await main();
