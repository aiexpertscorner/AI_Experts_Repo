import { execSync } from "node:child_process";

const commands = [
  "node scripts/normalize/01-normalize-tools.mjs",
  "node scripts/taxonomy/02-build-taxonomy-registry.mjs",
  "node scripts/taxonomy/03-assign-taxonomy.mjs",
  "ENRICH_MODE=full node scripts/enrich/04-enrich-tools.mjs",
  "node scripts/validate/05-validate-build-inputs.mjs",
  "node scripts/graphs/06-build-graph-layer.mjs",
  "BUILD_PHASE=phase_1 node scripts/manifests/07-build-page-manifest.mjs",
  "node scripts/payloads/08-build-page-payloads.mjs"
];

for (const cmd of commands) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", shell: true });
}
