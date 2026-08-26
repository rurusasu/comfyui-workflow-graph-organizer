import { describe, expect, it, vi } from "vitest";
import {
  assertCaptureOrigin,
  withExclusiveCaptureRuntime,
} from "../../scripts/capture-documentation-assets-lifecycle";

describe("documentation asset capture lifecycle", () => {
  it("fails closed for a reused 8199 marker before opening the browser", async () => {
    let marker: string | undefined = "external";
    const teardown = vi.fn(async () => {
      marker = undefined;
    });
    const capture = vi.fn(async () => undefined);

    await expect(
      withExclusiveCaptureRuntime(
        {
          setup: async () => undefined,
          teardown,
          readPidMarker: () => marker,
        },
        capture,
      ),
    ).rejects.toThrow(/8199.*occupied or reused/i);
    expect(capture).not.toHaveBeenCalled();
    expect(teardown).toHaveBeenCalledOnce();
    expect(marker).toBeUndefined();
  });

  it("runs capture only when setup wrote a numeric spawned PID marker", async () => {
    const teardown = vi.fn(async () => undefined);
    const capture = vi.fn(async () => undefined);

    await withExclusiveCaptureRuntime(
      {
        setup: async () => undefined,
        teardown,
        readPidMarker: () => "4242",
      },
      capture,
    );

    expect(capture).toHaveBeenCalledOnce();
    expect(teardown).toHaveBeenCalledOnce();
  });

  it("runs teardown when setup fails before capture", async () => {
    const teardown = vi.fn(async () => undefined);
    const capture = vi.fn(async () => undefined);

    await expect(
      withExclusiveCaptureRuntime(
        {
          setup: async () => {
            throw new Error("setup failed");
          },
          teardown,
          readPidMarker: () => undefined,
        },
        capture,
      ),
    ).rejects.toThrow("setup failed");
    expect(capture).not.toHaveBeenCalled();
    expect(teardown).toHaveBeenCalledOnce();
  });

  it("allows only the dedicated capture origin", () => {
    expect(() => assertCaptureOrigin("http://localhost:8199/")).not.toThrow();
    expect(() => assertCaptureOrigin("http://localhost:8288/")).toThrow(/8199/);
    expect(() => assertCaptureOrigin("https://localhost:8199/")).toThrow(/8199/);
  });
});
