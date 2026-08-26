import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

const runGit = (directory: string, args: string[]): string =>
  execFileSync("git", args, {
    cwd: directory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("release tag creation", () => {
  it("creates an annotated tag on an identity-free GitHub runner", () => {
    const repository = mkdtempSync(join(tmpdir(), "workflow-release-tag-"));
    const emptyHome = join(repository, "empty-home");
    temporaryDirectories.push(repository);
    mkdirSync(emptyHome);

    runGit(repository, ["init", "--initial-branch=main"]);
    writeFileSync(join(repository, "release.txt"), "reviewed\n");
    runGit(repository, ["add", "release.txt"]);
    runGit(repository, [
      "-c",
      "user.name=Fixture Author",
      "-c",
      "user.email=fixture@example.com",
      "commit",
      "-m",
      "Reviewed release",
    ]);
    const releaseSha = runGit(repository, ["rev-parse", "HEAD"]);

    execFileSync(
      "bash",
      [
        resolve("scripts/create-release-tag.sh"),
        "workflow-graph-organizer-v1.0.0",
        releaseSha,
      ],
      {
        cwd: repository,
        env: {
          ...process.env,
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
          HOME: emptyHome,
          XDG_CONFIG_HOME: emptyHome,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    expect(
      runGit(repository, [
        "cat-file",
        "-t",
        "workflow-graph-organizer-v1.0.0",
      ]),
    ).toBe("tag");
    expect(
      runGit(repository, [
        "rev-list",
        "-n",
        "1",
        "workflow-graph-organizer-v1.0.0",
      ]),
    ).toBe(releaseSha);
    expect(
      runGit(repository, [
        "for-each-ref",
        "--format=%(taggername)|%(taggeremail)",
        "refs/tags/workflow-graph-organizer-v1.0.0",
      ]),
    ).toBe(
      "github-actions[bot]|<41898282+github-actions[bot]@users.noreply.github.com>",
    );
  });
});
