/**
 * Browser Launcher for FlashClaw
 * 
 * Supports Chrome, Chromium, Edge, and Brave on Windows/macOS/Linux.
 * Launches browser with CDP (Chrome DevTools Protocol) debugging enabled.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type BrowserKind = "chrome" | "chromium" | "edge" | "brave";

export interface BrowserExecutable {
  kind: BrowserKind;
  path: string;
}

export interface LaunchOptions {
  headless?: boolean;
  port?: number;
  userDataDir?: string;
  noSandbox?: boolean;
}

export interface BrowserInstance {
  cdpUrl: string;
  pid: number;
  close: () => Promise<void>;
}

const DEFAULT_CDP_PORT = 9222;

// ============================================================================
// Browser Detection
// ============================================================================

function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function findFirstExecutable(candidates: BrowserExecutable[]): BrowserExecutable | null {
  for (const candidate of candidates) {
    if (exists(candidate.path)) {
      return candidate;
    }
  }
  return null;
}

function findBrowserExecutableMac(): BrowserExecutable | null {
  const home = os.homedir();
  const candidates: BrowserExecutable[] = [
    { kind: "chrome", path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" },
    { kind: "chrome", path: path.join(home, "Applications/Google Chrome.app/Contents/MacOS/Google Chrome") },
    { kind: "brave", path: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" },
    { kind: "brave", path: path.join(home, "Applications/Brave Browser.app/Contents/MacOS/Brave Browser") },
    { kind: "edge", path: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" },
    { kind: "edge", path: path.join(home, "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge") },
    { kind: "chromium", path: "/Applications/Chromium.app/Contents/MacOS/Chromium" },
    { kind: "chromium", path: path.join(home, "Applications/Chromium.app/Contents/MacOS/Chromium") },
  ];
  return findFirstExecutable(candidates);
}

function findBrowserExecutableLinux(): BrowserExecutable | null {
  const candidates: BrowserExecutable[] = [
    { kind: "chrome", path: "/usr/bin/google-chrome" },
    { kind: "chrome", path: "/usr/bin/google-chrome-stable" },
    { kind: "chrome", path: "/usr/bin/chrome" },
    { kind: "brave", path: "/usr/bin/brave-browser" },
    { kind: "brave", path: "/usr/bin/brave-browser-stable" },
    { kind: "brave", path: "/usr/bin/brave" },
    { kind: "brave", path: "/snap/bin/brave" },
    { kind: "edge", path: "/usr/bin/microsoft-edge" },
    { kind: "edge", path: "/usr/bin/microsoft-edge-stable" },
    { kind: "chromium", path: "/usr/bin/chromium" },
    { kind: "chromium", path: "/usr/bin/chromium-browser" },
    { kind: "chromium", path: "/snap/bin/chromium" },
  ];
  return findFirstExecutable(candidates);
}

function findBrowserExecutableWindows(): BrowserExecutable | null {
  const localAppData = process.env.LOCALAPPDATA ?? "";
  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";

  const candidates: BrowserExecutable[] = [];

  if (localAppData) {
    // User installs
    candidates.push(
      { kind: "chrome", path: path.win32.join(localAppData, "Google", "Chrome", "Application", "chrome.exe") },
      { kind: "brave", path: path.win32.join(localAppData, "BraveSoftware", "Brave-Browser", "Application", "brave.exe") },
      { kind: "edge", path: path.win32.join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe") },
      { kind: "chromium", path: path.win32.join(localAppData, "Chromium", "Application", "chrome.exe") },
    );
  }

  // System installs (64-bit and 32-bit paths)
  candidates.push(
    { kind: "chrome", path: path.win32.join(programFiles, "Google", "Chrome", "Application", "chrome.exe") },
    { kind: "chrome", path: path.win32.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe") },
    { kind: "brave", path: path.win32.join(programFiles, "BraveSoftware", "Brave-Browser", "Application", "brave.exe") },
    { kind: "brave", path: path.win32.join(programFilesX86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe") },
    { kind: "edge", path: path.win32.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe") },
    { kind: "edge", path: path.win32.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe") },
  );

  return findFirstExecutable(candidates);
}

/**
 * Find the first available browser executable on the system.
 * Searches for Chrome, Brave, Edge, and Chromium in common installation paths.
 */
export function findBrowserExecutable(): string | null {
  const platform = process.platform;
  let exe: BrowserExecutable | null = null;

  if (platform === "darwin") {
    exe = findBrowserExecutableMac();
  } else if (platform === "linux") {
    exe = findBrowserExecutableLinux();
  } else if (platform === "win32") {
    exe = findBrowserExecutableWindows();
  }

  return exe?.path ?? null;
}

// ============================================================================
// CDP Readiness Check
// ============================================================================

export async function isCdpReady(cdpUrl: string, timeoutMs = 500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${cdpUrl}/json/version`, {
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const data = await response.json();
    return Boolean(data?.webSocketDebuggerUrl);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForCdpReady(cdpUrl: string, timeoutMs = 15000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isCdpReady(cdpUrl)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

// ============================================================================
// Browser Launch
// ============================================================================

function buildLaunchArgs(options: LaunchOptions & { cdpPort: number; userDataDir: string }): string[] {
  const args: string[] = [
    `--remote-debugging-port=${options.cdpPort}`,
    `--user-data-dir=${options.userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-features=Translate,MediaRouter",
    "--disable-session-crashed-bubble",
    "--hide-crash-restore-bubble",
  ];

  if (options.headless) {
    args.push("--headless=new", "--disable-gpu");
  }

  if (options.noSandbox) {
    args.push("--no-sandbox", "--disable-setuid-sandbox");
  }

  if (process.platform === "linux") {
    args.push("--disable-dev-shm-usage");
  }

  // Open a blank tab to ensure a target exists
  args.push("about:blank");

  return args;
}

/**
 * Launch a browser with CDP debugging enabled.
 * 
 * @param options - Launch options
 * @returns Browser instance with cdpUrl, pid, and close function
 * @throws Error if no browser is found or CDP fails to start
 */
export async function launchBrowser(options: LaunchOptions = {}): Promise<BrowserInstance> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    throw new Error("No supported browser found (Chrome/Brave/Edge/Chromium).");
  }

  const cdpPort = options.port ?? DEFAULT_CDP_PORT;
  const cdpUrl = `http://127.0.0.1:${cdpPort}`;

  // Create temporary user data directory if not provided
  const userDataDir = options.userDataDir ?? path.join(os.tmpdir(), `flashclaw-browser-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const args = buildLaunchArgs({
    ...options,
    cdpPort,
    userDataDir,
  });

  const proc: ChildProcessWithoutNullStreams = spawn(executablePath, args, {
    stdio: "pipe",
    env: { ...process.env, HOME: os.homedir() },
  });

  const pid = proc.pid ?? -1;

  // Wait for CDP to be ready
  const ready = await waitForCdpReady(cdpUrl);
  if (!ready) {
    try {
      proc.kill("SIGKILL");
    } catch {
      // ignore
    }
    throw new Error(`Failed to start browser CDP on port ${cdpPort}.`);
  }

  // Close function to terminate the browser
  const close = async (): Promise<void> => {
    if (proc.killed) return;

    try {
      proc.kill("SIGTERM");
    } catch {
      // ignore
    }

    // Wait for graceful shutdown
    const shutdownDeadline = Date.now() + 2500;
    while (Date.now() < shutdownDeadline) {
      if (proc.exitCode !== null || proc.killed) break;
      if (!(await isCdpReady(cdpUrl, 200))) return;
      await new Promise((r) => setTimeout(r, 100));
    }

    // Force kill if still running
    try {
      proc.kill("SIGKILL");
    } catch {
      // ignore
    }
  };

  return { cdpUrl, pid, close };
}
