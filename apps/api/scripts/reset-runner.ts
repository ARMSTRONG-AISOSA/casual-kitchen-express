// The laptop's runner for Reset demo data (MGR-29): a tiny server on 127.0.0.1:8790 that the local
// API calls when a manager taps Reset demo data. It runs scripts/reset-demo.ts once at a time.
// Online, GitHub Actions does this job instead (.github/workflows/reset-demo.yml).
//   npm run demo:runner --workspace @cke/api
// It only listens on this computer, and only acts on requests carrying DEMO_RESET_SECRET from
// apps/api/.dev.vars, the same value the API has.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { devVar } from "./owner";

const here = dirname(fileURLToPath(import.meta.url));
const secret = process.env.DEMO_RESET_SECRET ?? devVar("DEMO_RESET_SECRET");
if (!secret) {
  console.error("DEMO_RESET_SECRET is missing from apps/api/.dev.vars (see .dev.vars.example).");
  process.exit(1);
}
const PORT = 8790;
let running = false;

createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/run") {
    res.writeHead(404).end();
    return;
  }
  if (req.headers["x-demo-reset-secret"] !== secret) {
    res.writeHead(403).end();
    return;
  }
  if (running) {
    res.writeHead(409).end("A reset is already running");
    return;
  }
  running = true;
  console.log(`${new Date().toLocaleTimeString()} Reset demo data started`);
  const child = spawn(process.execPath, ["--import", "tsx", join(here, "reset-demo.ts")], {
    cwd: join(here, ".."),
    // The laptop keeps the managers' usernames, which the API tests use (seed-people.ts).
    env: { ...process.env, SEED_MANAGER_PASSWORDS: "1", DEMO_RESET_SECRET: secret },
    stdio: "inherit",
  });
  child.on("exit", (code) => {
    running = false;
    console.log(
      `${new Date().toLocaleTimeString()} Reset demo data ${code ? "failed" : "finished"}`,
    );
  });
  res.writeHead(202).end("Started");
}).listen(PORT, "127.0.0.1", () =>
  console.log(`Reset demo data helper ready on http://127.0.0.1:${PORT} (Ctrl+C to stop)`),
);
