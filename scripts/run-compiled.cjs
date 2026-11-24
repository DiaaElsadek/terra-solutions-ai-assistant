/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const mode = process.argv[2];
if (mode !== "eval" && mode !== "test") {
  console.error("Usage: node scripts/run-compiled.cjs <eval|test>");
  process.exit(2);
}

const root = process.cwd();
const distDir = path.join(root, ".tmp-test-dist");
const tscBin = require.resolve("typescript/bin/tsc");
const hookPath = path.join(root, "scripts", "cjs-alias-hook.cjs");

function cleanDist() {
  try {
    fs.rmSync(distDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup issues
  }
}

cleanDist();

let exitCode = 1;

try {
  const compileResult = spawnSync(
    process.execPath,
    [tscBin, "-p", path.join(root, "tsconfig.runner.json")],
    { cwd: root, stdio: "inherit" }
  );

  if (compileResult.status !== 0) {
    exitCode = compileResult.status ?? 1;
    process.exitCode = exitCode;
  } else if (mode === "eval") {
    const evalEntry = path.join(distDir, "evaluation", "evaluation-report.js");
    const runResult = spawnSync(
      process.execPath,
      ["--require", hookPath, evalEntry],
      { cwd: root, stdio: "inherit" }
    );
    exitCode = runResult.status ?? 1;
    process.exitCode = exitCode;
  } else {
    const testDir = path.join(distDir, "tests");
    const testFiles = fs.existsSync(testDir)
      ? fs
          .readdirSync(testDir)
          .filter((name) => name.endsWith(".test.js"))
          .sort()
          .map((name) => path.join(testDir, name))
      : [];

    if (testFiles.length === 0) {
      console.error("No compiled test files found in .tmp-test-dist/tests");
      exitCode = 1;
      process.exitCode = 1;
    } else {
      const runResult = spawnSync(
        process.execPath,
        ["--require", hookPath, "--test", ...testFiles],
        { cwd: root, stdio: "inherit" }
      );
      exitCode = runResult.status ?? 1;
      process.exitCode = exitCode;
    }
  }
} finally {
  cleanDist();
}

