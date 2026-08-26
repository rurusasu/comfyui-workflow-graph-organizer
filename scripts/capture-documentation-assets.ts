import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { e2eConfig } from "../e2e.config.ts";
import globalSetup from "../tests/e2e/global-setup.ts";
import globalTeardown from "../tests/e2e/global-teardown.ts";

const fixture = JSON.parse(
  readFileSync("tests/fixtures/whole-workflow-layout.json", "utf8"),
) as Record<string, unknown>;

async function fitGraph(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: /Fit View/ }).click({ force: true });
  await page.waitForTimeout(750);
}

async function main(): Promise<void> {
  await globalSetup();
  try {
    const browser = await chromium.launch({ headless: true });
    try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(e2eConfig.comfyUrl);
    await page.waitForFunction(
      () => !!(window as unknown as { app?: { extensionManager?: unknown } }).app?.extensionManager,
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
        app.extensionManager.command.execute("workflow-graph-organizer.organize"),
      );
    });
    await page.waitForTimeout(1_000);
    await fitGraph(page);
    await page.locator("#graph-canvas").screenshot({
      path: "assets/workflow-graph-after.png",
    });
    console.log("Captured assets/workflow-graph-before.png");
    console.log("Captured assets/workflow-graph-after.png");
    } finally {
      await browser.close();
    }
  } finally {
    await globalTeardown();
  }
}

await main();
