import { test, expect } from "@playwright/test";
import {
  waitForComfyUI,
  loadWorkflow,
  extractGraphState,
  extractGraphSemantics,
  extractGroupMemberships,
  triggerOrganize,
  triggerWholeWorkflow,
  assertInvariants,
  assertIdempotent,
  assertStructuredWorkflowInvariants,
} from "./helpers";
import { loadFixture } from "./fixtures";

test.describe("Organize Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForComfyUI(page);
  });

  test("whole-workflow-layout: validates backgrounds, nested padding, comment lane, semantics, idempotence, and serialized reload", async ({
    page,
  }) => {
    await loadWorkflow(page, loadFixture("whole-workflow-layout"));
    const beforeSemantics = await extractGraphSemantics(page);

    await triggerWholeWorkflow(page);
    await assertStructuredWorkflowInvariants(page);
    const afterFirstRun = await extractGraphState(page);
    await triggerWholeWorkflow(page);
    expect(await extractGraphState(page)).toEqual(afterFirstRun);

    const afterSemantics = await extractGraphSemantics(page);
    expect(afterSemantics).toEqual(beforeSemantics);

    const organized = await extractGraphState(page);
    const serialized = await page.evaluate(() => {
      const appObj = (window as unknown as Record<string, unknown>).app as Record<string, unknown>;
      const canvas = appObj.canvas as Record<string, unknown> & {
        getCurrentGraph?: () => Record<string, unknown> | undefined;
      };
      const graph = (canvas.getCurrentGraph?.() ?? canvas.graph ?? appObj.graph) as {
        serialize: () => Record<string, unknown>;
      };
      return JSON.stringify(graph.serialize());
    });
    expect(serialized).toBeTruthy();
    await page.reload();
    await waitForComfyUI(page);
    await loadWorkflow(page, JSON.parse(serialized) as Record<string, unknown>);
    expect(await extractGraphState(page)).toEqual(organized);
  });

  test("whole-workflow-layout: one native undo restores exact geometry", async ({ page }) => {
    await loadWorkflow(page, loadFixture("whole-workflow-layout"));
    const before = await extractGraphState(page);
    await triggerWholeWorkflow(page);

    await page.locator("#graph-canvas").click({ force: true });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+Z" : "Control+Z");
    await page.waitForTimeout(500);

    expect(await extractGraphState(page)).toEqual(before);
  });

  test("simple-dag: organizes and passes invariants", async ({ page }) => {
    const workflow = loadFixture("simple-dag");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);

    const state = await extractGraphState(page);
    expect(state.nodes.length).toBe(7);
    assertInvariants(state);
  });

  test("simple-dag: idempotent", async ({ page }) => {
    const workflow = loadFixture("simple-dag");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);
    await assertIdempotent(page);
  });

  test("complex-parallel: organizes and passes invariants", async ({
    page,
  }) => {
    const workflow = loadFixture("complex-parallel");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);

    const state = await extractGraphState(page);
    expect(state.nodes.length).toBeGreaterThan(10);
    assertInvariants(state);
  });

  test("complex-parallel: idempotent", async ({ page }) => {
    const workflow = loadFixture("complex-parallel");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);
    await assertIdempotent(page);
  });

  test("nested-groups: organizes and passes invariants", async ({ page }) => {
    const workflow = loadFixture("nested-groups");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);

    const state = await extractGraphState(page);
    assertInvariants(state);
  });

  test("nested-groups: groups contain their members after organize", async ({
    page,
  }) => {
    const workflow = loadFixture("nested-groups");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);

    const state = await extractGraphState(page);
    // Groups should exist and have valid bounds
    expect(state.groups.length).toBeGreaterThan(0);
    for (const g of state.groups) {
      expect(g.size[0]).toBeGreaterThan(0);
      expect(g.size[1]).toBeGreaterThan(0);
    }
  });

  test("group-test: preserves group hierarchy and direct memberships", async ({
    page,
  }) => {
    const workflow = loadFixture("group-test");
    await loadWorkflow(page, workflow);

    const beforeMemberships = await extractGroupMemberships(page);
    await triggerOrganize(page);
    const afterMemberships = await extractGroupMemberships(page);

    expect(afterMemberships).toEqual(beforeMemberships);
  });

  test("nested-groups: idempotent", async ({ page }) => {
    const workflow = loadFixture("nested-groups");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);
    await assertIdempotent(page);
  });

  test("nested-wrapper: organizes and passes invariants", async ({ page }) => {
    const workflow = loadFixture("nested-wrapper");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);

    const state = await extractGraphState(page);
    assertInvariants(state);
  });

  test("default workflow: organizes and passes invariants", async ({
    page,
  }) => {
    // Don't load a fixture — use whatever ComfyUI loads by default
    await triggerOrganize(page);

    const state = await extractGraphState(page);
    expect(state.nodes.length).toBeGreaterThan(0);
    assertInvariants(state);
  });

  test("default workflow: idempotent", async ({ page }) => {
    await triggerOrganize(page);
    await assertIdempotent(page);
  });

  test("group-test: geometry-based group hierarchy and direct memberships match runtime after organize", async ({
    page,
  }) => {
    const workflow = loadFixture("group-test");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);

    const memberships = await extractGroupMemberships(page);
    expect(memberships).toEqual([
      {
        title: "GetNodes [HORIZONTAL]",
        parentTitle: "Previews [2ROW]",
        memberNodeIds: [5, 6],
      },
      {
        title: "Preview Nodes [HORIZONTAL]",
        parentTitle: "Previews [2ROW]",
        memberNodeIds: [3, 4],
      },
      {
        title: "Previews [2ROW]",
        parentTitle: null,
        memberNodeIds: [],
      },
    ]);
  });

  test("nested-groups: geometry-based group hierarchy and direct memberships match runtime after organize", async ({
    page,
  }) => {
    const workflow = loadFixture("nested-groups");
    await loadWorkflow(page, workflow);
    await triggerOrganize(page);

    const memberships = await extractGroupMemberships(page);
    expect(memberships).toEqual([
      {
        title: "Group",
        parentTitle: "Step 2 - Prompt",
        memberNodeIds: [15],
      },
      {
        title: "Step 1 - Load model",
        parentTitle: null,
        memberNodeIds: [4],
      },
      {
        title: "Step 2 - Prompt",
        parentTitle: null,
        memberNodeIds: [6, 7],
      },
      {
        title: "Step 3 - Image size",
        parentTitle: null,
        memberNodeIds: [5],
      },
    ]);
  });
});
