import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Keep the existing Next runtime while accepting Work Mode preview flags.
const args = process.argv.slice(2).filter((arg) => arg !== "--strictPort")
  .map((arg) => arg === "--host" ? "--hostname" : arg);
if (!args.includes("--hostname") && !args.includes("-H")) {
  args.push("--hostname", "127.0.0.1");
}
const executable = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [executable, "dev", ...args], { stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
