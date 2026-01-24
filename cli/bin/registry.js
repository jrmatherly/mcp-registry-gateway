#!/usr/bin/env node

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

const child = spawn(
  "npx",
  ["tsx", join(projectRoot, "src/index.tsx"), ...process.argv.slice(2)],
  {
    stdio: "inherit",
    shell: true,
  },
);

child.on("exit", (code) => {
  process.exit(code);
});
