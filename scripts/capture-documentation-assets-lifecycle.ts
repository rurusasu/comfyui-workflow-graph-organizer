export type CaptureRuntime = {
  setup: () => Promise<void>;
  teardown: () => Promise<void>;
  readPidMarker: () => string | undefined;
};

export function assertCaptureOrigin(url: string): void {
  if (new URL(url).origin !== "http://localhost:8199") {
    throw new Error(`Documentation capture must stay on http://localhost:8199, got ${url}`);
  }
}

export async function withExclusiveCaptureRuntime(
  runtime: CaptureRuntime,
  capture: () => Promise<void>,
): Promise<void> {
  try {
    await runtime.setup();
    const marker = runtime.readPidMarker()?.trim();
    if (!marker || !/^[1-9]\d*$/.test(marker)) {
      throw new Error(
        "Documentation capture fails closed when port 8199 is occupied or reused.",
      );
    }
    await capture();
  } finally {
    await runtime.teardown();
  }
}
