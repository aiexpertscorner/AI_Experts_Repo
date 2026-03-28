/**
 * scripts/split-tool-map.mjs
 * ─────────────────────────────────────────────────────────────────
 * Splitst src/data/build/tool-map.json (222MB) in individuele
 * JSON bestanden per tool: src/data/build/tools/[slug].json
 *
 * Dit script runt VOOR de Astro build zodat [slug].astro
 * alleen het bestand van die specifieke tool laadt (~12KB)
 * in plaats van de hele 222MB in geheugen.
 *
 * Run: node scripts/split-tool-map.mjs
 * Of automatisch via: npm run prebuild
 * ─────────────────────────────────────────────────────────────────
 */

import fs   from "node:fs";
import path from "node:path";

const ROOT       = process.cwd();
const INPUT      = path.join(ROOT, "src/data/build/tool-map.json");
const OUT_DIR    = path.join(ROOT, "src/data/build/tools");
const PATHS_FILE = path.join(ROOT, "src/data/build/tool-slugs.json");

console.log("\n🔧 split-tool-map.mjs — Splitting tool-map.json into individual files");
console.log(`   Input:  ${INPUT}`);
console.log(`   Output: ${OUT_DIR}/[slug].json\n`);

// Check input exists
if (!fs.existsSync(INPUT)) {
  console.error(`❌ tool-map.json not found at: ${INPUT}`);
  process.exit(1);
}

// Check if split is already up to date
const inputMtime  = fs.statSync(INPUT).mtimeMs;
const flagFile    = path.join(OUT_DIR, "_split_timestamp.txt");
if (fs.existsSync(flagFile)) {
  const lastSplit = parseFloat(fs.readFileSync(flagFile, "utf8").trim());
  if (lastSplit >= inputMtime) {
    const existing = fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".json")).length;
    console.log(`✅ Already split (${existing.toLocaleString()} files, up to date). Skipping.\n`);
    process.exit(0);
  }
}

// Create output directory
fs.mkdirSync(OUT_DIR, { recursive: true });

// Read and parse
console.log("📖 Reading tool-map.json...");
const raw = fs.readFileSync(INPUT, "utf8");
console.log(`   File size: ${Math.round(raw.length / 1024 / 1024 * 10) / 10} MB`);

let toolMap;
try {
  toolMap = JSON.parse(raw);
} catch (e) {
  console.error(`❌ JSON parse error: ${e.message}`);
  process.exit(1);
}

const slugs = Object.keys(toolMap);
console.log(`   Tools: ${slugs.length.toLocaleString()}`);
console.log("✂️  Splitting...");

let written = 0;
let skipped = 0;
const startMs = Date.now();

for (const slug of slugs) {
  const tool     = toolMap[slug];
  const filePath = path.join(OUT_DIR, `${slug}.json`);

  // Only write if content changed (avoid unnecessary I/O)
  const content = JSON.stringify(tool);
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (existing === content) { skipped++; continue; }
  }

  fs.writeFileSync(filePath, content, "utf8");
  written++;

  if (written % 2000 === 0) {
    process.stdout.write(`\r   Written: ${written.toLocaleString()} / ${slugs.length.toLocaleString()}...`);
  }
}

// Write slug list for getStaticPaths
fs.writeFileSync(PATHS_FILE, JSON.stringify(slugs), "utf8");

// Write timestamp flag
fs.writeFileSync(flagFile, String(inputMtime), "utf8");

const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
const totalFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".json")).length;

console.log(`\n\n✅ Split complete in ${elapsed}s`);
console.log(`   Written:  ${written.toLocaleString()} files`);
console.log(`   Skipped:  ${skipped.toLocaleString()} (unchanged)`);
console.log(`   Total:    ${totalFiles.toLocaleString()} tool files`);
console.log(`   Avg size: ~${Math.round(raw.length / slugs.length / 1024)} KB per tool\n`);
