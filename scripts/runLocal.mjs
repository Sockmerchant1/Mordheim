import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const appUrl = "http://127.0.0.1:5173";
const apiUrl = "http://127.0.0.1:5174/api/health";
const requiredMajorNodeVersion = 24;
const children = new Set();

main().catch((error) => {
  console.error("");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  process.chdir(rootDir);
  checkNodeVersion();

  const appAlreadyRunning = await canReach(appUrl);
  const apiAlreadyRunning = await canReach(apiUrl);

  if (appAlreadyRunning && apiAlreadyRunning) {
    console.log("Mordheim is already running.");
    await openBrowser(appUrl);
    return;
  }

  ensureDependencies();

  if (!apiAlreadyRunning) {
    startProcess("api", process.execPath, ["--experimental-sqlite", "server/index.ts"]);
  } else {
    console.log("API already running on http://127.0.0.1:5174");
  }

  if (!appAlreadyRunning) {
    startProcess("web", process.execPath, [join("node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1"]);
  } else {
    console.log("App already running on http://127.0.0.1:5173");
  }

  console.log("");
  console.log("Starting Mordheim Warband Manager...");
  if (!apiAlreadyRunning) {
    await waitFor(apiUrl, 60_000);
  }
  await waitFor(appUrl, 60_000);
  console.log(`Open ${appUrl}`);
  await openBrowser(appUrl);
  console.log("");
  console.log("Keep this window open while using the local app. Press Ctrl+C to stop it.");
  installShutdownHandlers();
}

function checkNodeVersion() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (major >= requiredMajorNodeVersion) return;

  throw new Error(
    `Node ${requiredMajorNodeVersion}+ is required for the local SQLite server. Current Node is ${process.version}.\n` +
      "Install Node 24 or newer, then run this launcher again."
  );
}

function ensureDependencies() {
  const viteBin = join(rootDir, "node_modules", "vite", "bin", "vite.js");
  if (existsSync(viteBin)) return;

  const npm = findNpm();
  if (!npm) {
    throw new Error(
      "Dependencies are not installed yet, and npm was not found.\n" +
        "Install Node.js 24 from https://nodejs.org, then run this launcher again."
    );
  }

  console.log("First-time setup: installing app dependencies. This can take a few minutes.");
  const result = spawnSync(npm.command, npm.args.concat(["install"]), {
    cwd: rootDir,
    env: process.env,
    shell: npm.shell,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("npm install failed. Fix the error above, then run the launcher again.");
  }
  if (!existsSync(viteBin)) {
    throw new Error("Dependencies installed, but Vite was not found in node_modules. Try deleting node_modules and running the launcher again.");
  }
}

function findNpm() {
  const localNpm = join(rootDir, ".tools", "package", "bin", "npm-cli.js");
  if (existsSync(localNpm)) {
    return { command: process.execPath, args: [localNpm], shell: false };
  }

  if (process.env.npm_execpath && existsSync(process.env.npm_execpath)) {
    return { command: process.execPath, args: [process.env.npm_execpath], shell: false };
  }

  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(command, ["--version"], { shell: process.platform === "win32", stdio: "ignore" });
  return result.status === 0 ? { command, args: [], shell: process.platform === "win32" } : undefined;
}

function startProcess(label, command, args) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  children.add(child);
  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  child.on("error", (error) => {
    children.delete(child);
    console.error(`[${label}] could not start: ${error.message}`);
    stopChildren();
    process.exit(1);
  });
  child.on("exit", (code, signal) => {
    children.delete(child);
    if (signal || code === 0) return;
    console.error(`[${label}] stopped with exit code ${code}`);
    stopChildren();
    process.exit(code ?? 1);
  });
}

async function canReach(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(900) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(url)) return;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openBrowser(url) {
  const opener =
    process.platform === "darwin"
      ? { command: "open", args: [url], shell: false }
      : process.platform === "win32"
        ? { command: "cmd", args: ["/c", "start", "", url], shell: false }
        : { command: "xdg-open", args: [url], shell: false };

  const result = spawnSync(opener.command, opener.args, { shell: opener.shell, stdio: "ignore" });
  if (result.status !== 0) {
    console.log(`Could not open the browser automatically. Visit ${url} manually.`);
  }
}

function installShutdownHandlers() {
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      stopChildren();
      process.exit(0);
    });
  }
}

function stopChildren() {
  for (const child of children) {
    child.kill();
  }
}
