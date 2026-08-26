import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { e2eConfig } from "../e2e.config.ts";
import {
  extractPinnedWorkflowTemplatesRequirement,
  setComfyManagerNetworkMode,
} from "./setup-test-comfy-helpers";

const isWindows = process.platform === "win32";
const projectRoot = resolve(import.meta.dirname, "..");

const venvDir = resolve(projectRoot, e2eConfig.venvDir);
const comfyInstallDir = resolve(projectRoot, e2eConfig.comfyInstallDir);
const customNodesDir = resolve(projectRoot, e2eConfig.customNodesDir);
const managerConfigPath = join(comfyInstallDir, "user", "__manager", "config.ini");

const pythonBin = isWindows
  ? join(venvDir, "Scripts", "python.exe")
  : join(venvDir, "bin", "python");

const comfyBin = isWindows
  ? join(venvDir, "Scripts", "comfy.exe")
  : join(venvDir, "bin", "comfy");

const comfyRuntimePython = isWindows
  ? join(comfyInstallDir, ".venv", "Scripts", "python.exe")
  : join(comfyInstallDir, ".venv", "bin", "python");

function tryExec(cmd: string): string | null {
  try {
    return execSync(cmd, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
}

function run(cmd: string, label: string) {
  console.log(`[setup] ${label}...`);
  console.log(`[setup]   $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: projectRoot });
}

function getInstalledComfyRevision(): string | null {
  const exactTag = tryExec(
    `git -C "${comfyInstallDir}" describe --tags --exact-match HEAD`,
  );
  if (exactTag) return exactTag;

  const gitHead = tryExec(`git -C "${comfyInstallDir}" rev-parse HEAD`);
  return gitHead;
}

function installComfy(revision: string): void {
  run(
    `"${comfyBin}" --skip-prompt --workspace "${comfyInstallDir}" install --version "${revision}" --restore --cpu`,
    `Installing ComfyUI ${revision}`,
  );
}

function hasHealthyComfyRuntime(): boolean {
  if (!existsSync(comfyRuntimePython)) return false;
  try {
    execSync(`"${comfyRuntimePython}" -c "import torch; import OpenGL.contextdata"`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function removeBrokenComfyRuntime(): void {
  const runtimeDir = resolve(comfyInstallDir, ".venv");
  const dedicatedTestRoot = resolve(projectRoot, e2eConfig.testComfyDir);
  if (!runtimeDir.startsWith(`${dedicatedTestRoot}/`)) {
    throw new Error(`Refusing to remove runtime outside dedicated E2E setup: ${runtimeDir}`);
  }
  if (existsSync(runtimeDir)) {
    console.log("[setup] Removing broken dedicated ComfyUI runtime before reinstall...");
    rmSync(runtimeDir, { recursive: true, force: true });
  }
}

function getPinnedWorkflowTemplatesRequirement(): string {
  const requirementsPath = resolve(comfyInstallDir, "requirements.txt");
  if (!existsSync(requirementsPath)) {
    throw new Error(
      `Pinned ComfyUI checkout is missing requirements.txt at ${requirementsPath}`,
    );
  }

  return extractPinnedWorkflowTemplatesRequirement(
    readFileSync(requirementsPath, "utf-8"),
  );
}

function configureDedicatedManager(): void {
  mkdirSync(dirname(managerConfigPath), { recursive: true });
  const current = existsSync(managerConfigPath)
    ? readFileSync(managerConfigPath, "utf-8")
    : "[default]\n";
  const configured = setComfyManagerNetworkMode(current);
  if (configured !== current) {
    writeFileSync(managerConfigPath, configured, "utf-8");
  }
  console.log("[setup] Configured dedicated ComfyUI Manager for local-only E2E operation.");
}

// Step 1: Create venv (with --seed so pip is available for comfy-cli)
if (existsSync(pythonBin)) {
  console.log("[setup] venv already exists, skipping.");
} else {
  if (existsSync(venvDir)) {
    console.log("[setup] Removing invalid venv directory before recreate...");
    rmSync(venvDir, { recursive: true, force: true });
  }
  mkdirSync(resolve(projectRoot, e2eConfig.testComfyDir), { recursive: true });
  run(`uv venv --seed "${venvDir}"`, "Creating Python venv (with pip)");
}

// Ensure pip is available (handles venvs created without --seed)
try {
  execSync(`"${pythonBin}" -m pip --version`, { stdio: "ignore" });
} catch {
  console.log("[setup] pip not found in venv, installing...");
  run(
    `uv pip install pip --python "${pythonBin}"`,
    "Installing pip into venv",
  );
}

// Step 2: Install comfy-cli
if (existsSync(comfyBin)) {
  console.log("[setup] comfy-cli already installed, skipping.");
} else {
  run(
    `uv pip install comfy-cli --python "${pythonBin}"`,
    "Installing comfy-cli",
  );
}

// Step 3: Install ComfyUI
// Check for main.py directly in workspace (comfy clones repo as workspace root)
if (existsSync(join(comfyInstallDir, "main.py"))) {
  console.log("[setup] ComfyUI repo already cloned.");
  const installedRevision = getInstalledComfyRevision();

  if (installedRevision === e2eConfig.comfyRevision) {
    if (hasHealthyComfyRuntime()) {
      console.log(
        `[setup] ComfyUI already pinned at ${e2eConfig.comfyRevision} and dependencies are installed.`,
      );
    } else {
      removeBrokenComfyRuntime();
      installComfy(e2eConfig.comfyRevision);
    }
  } else {
    console.log(
      `[setup] Syncing ComfyUI to ${e2eConfig.comfyRevision} (current: ${installedRevision ?? "unknown"})...`,
    );
    installComfy(e2eConfig.comfyRevision);
  }
} else {
  // Fresh install: clean up any invalid workspace state
  if (existsSync(comfyInstallDir)) {
    console.log(
      "[setup] Removing invalid workspace directory before install...",
    );
    rmSync(comfyInstallDir, { recursive: true, force: true });
  }
  mkdirSync(resolve(comfyInstallDir, ".."), { recursive: true });
  installComfy(e2eConfig.comfyRevision);
}

// Step 3b: Install the exact workflow templates package required by the
// pinned ComfyUI checkout. Do not hardcode or float this version here.
const workflowTemplatesRequirement = getPinnedWorkflowTemplatesRequirement();
run(
  `uv pip install "${workflowTemplatesRequirement}" --python "${pythonBin}"`,
  `Installing ${workflowTemplatesRequirement}`,
);

configureDedicatedManager();

// Step 4: Symlink extension into custom_nodes
const symlinkTarget = resolve(customNodesDir, "workflow-graph-organizer");
if (existsSync(symlinkTarget)) {
  try {
    const linkDest = readlinkSync(symlinkTarget);
    const resolvedLink = resolve(customNodesDir, linkDest);
    if (resolvedLink === projectRoot) {
      console.log("[setup] Symlink already exists and is correct, skipping.");
    } else {
      console.log(
        `[setup] WARNING: Symlink exists but points to ${resolvedLink}, expected ${projectRoot}`,
      );
    }
  } catch {
    console.log(
      "[setup] WARNING: Path exists but is not a symlink. Manual cleanup may be needed.",
    );
  }
} else {
  mkdirSync(customNodesDir, { recursive: true });
  symlinkSync(projectRoot, symlinkTarget, isWindows ? "junction" : "dir");
  console.log(`[setup] Created symlink: ${symlinkTarget} -> ${projectRoot}`);
}

console.log("[setup] Done! Run `pnpm test:e2e` to run e2e tests.");
