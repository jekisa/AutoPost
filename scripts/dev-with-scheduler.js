#!/usr/bin/env node

const { spawn } = require("node:child_process");

const children = [];
let isShuttingDown = false;

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    stdio: ["inherit", "pipe", "pipe"]
  });

  children.push(child);

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  child.on("exit", (code, signal) => {
    if (!isShuttingDown) {
      console.error(`[${name}] exited with ${signal ?? code}`);
      shutdown(code ?? 1);
    }
  });

  return child;
}

function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) child.kill();
  }

  process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

run("next", "node", ["./scripts/next-with-patches.js", "dev", "--webpack", ...process.argv.slice(2)]);
run("scheduler", "node", ["scripts/publish-scheduled-worker.mjs"]);
