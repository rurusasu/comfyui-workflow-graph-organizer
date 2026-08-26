import { afterEach, describe, expect, it, vi } from "vitest";

describe("Playwright CI policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("fails hosted CI when a retry makes a test flaky", async () => {
    vi.stubEnv("CI", "true");
    vi.resetModules();

    const { default: config } = await import("../../playwright.config.ts");

    expect(config.retries).toBe(2);
    expect(config.failOnFlakyTests).toBe(true);
  });
});
