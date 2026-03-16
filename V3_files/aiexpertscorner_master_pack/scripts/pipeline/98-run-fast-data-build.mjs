import { execSync } from "node:child_process";

const commands = [
  "node scripts/graphs/06-build-graph-layer.mjs",
  "BUILD_PHASE=phase_1 node scripts/manifests/07-build-page-manifest.mjs",
  "node scripts/payloads/08-build-page-payloads.mjs"
];

for (const cmd of commands) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true });
}
