import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
  "01-validate-top100.mjs",
  "02-enrichment-priority-report.mjs",
  "03-build-derived-datasets.mjs",
  "04-build-page-payloads.mjs",
];

for (const script of scripts) {
  console.log(`\n=== Running ${script} ===`);
  execSync(`node ${path.join(__dirname, script)}`, { stdio: "inherit" });
}

console.log("\nAll scripts completed.");
