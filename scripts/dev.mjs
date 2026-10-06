import { spawn } from "node:child_process";
const portIndex = process.argv.indexOf("--port");
const webPort = portIndex >= 0 ? process.argv[portIndex + 1] : "5173";
const jobs = [
  spawn(
    process.execPath,
    ["--env-file-if-exists=.env", "--import", "tsx", "server/index.ts"],
    { stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", webPort],
    { stdio: "inherit" },
  ),
];
let closing = false;
const close = (code = 0) => {
  if (closing) return;
  closing = true;
  jobs.forEach((p) => p.kill("SIGTERM"));
  setTimeout(() => process.exit(code), 100).unref();
};
jobs.forEach((p) => {
  p.on("exit", (code) => close(code || 0));
  p.on("error", () => close(1));
});
process.on("SIGINT", () => close());
process.on("SIGTERM", () => close());
