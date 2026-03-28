/**
 * master-audit.mjs
 * ─────────────────────────────────────────────────────────────────
 * Zet dit bestand in de ROOT van je AI_Experts_Repo folder.
 * Run: node master-audit.mjs
 *
 * Geeft een volledig overzicht van je project aan Claude.
 * ─────────────────────────────────────────────────────────────────
 */

import fs   from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ── Helpers ───────────────────────────────────────────────────────
function exists(p)   { return fs.existsSync(p); }
function lines(p)    { try { return fs.readFileSync(p,"utf8").split("\n").length; } catch { return 0; } }
function sizeKb(p)   { try { return Math.round(fs.statSync(p).size/1024); } catch { return 0; } }
function readTxt(p)  { try { return fs.readFileSync(p,"utf8"); } catch { return ""; } }
function readJson(p) { try { return JSON.parse(readTxt(p)); } catch { return null; } }

function walkDir(dir, exts, maxDepth=5, depth=0) {
  if (!exists(dir) || depth > maxDepth) return [];
  const out = [];
  try {
    for (const e of fs.readdirSync(dir)) {
      if (["node_modules",".git","dist",".astro"].includes(e)) continue;
      const full = path.join(dir, e);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) out.push(...walkDir(full, exts, maxDepth, depth+1));
      else if (!exts || exts.some(x => e.endsWith(x))) out.push(full);
    }
  } catch {}
  return out;
}

function rel(p) { return p.replace(ROOT,"").replace(/\\/g,"/").replace(/^\//,""); }

const out = [];
function log(s="") { out.push(s); console.log(s); }

// ═══════════════════════════════════════════════════════════════════
log("╔══════════════════════════════════════════════════════════╗");
log("║  AIExpertsCorner — Master Audit                         ║");
log("╚══════════════════════════════════════════════════════════╝");
log(`Root: ${ROOT}`);
log();

// ── 1. Git branch ─────────────────────────────────────────────────
try {
  const { execSync } = await import("node:child_process");
  const branch = execSync("git branch --show-current", { cwd: ROOT }).toString().trim();
  log(`GIT BRANCH: ${branch}`);
} catch { log("GIT BRANCH: (could not detect)"); }
log();

// ── 2. Package.json ───────────────────────────────────────────────
log("── PACKAGE.JSON ─────────────────────────────────────────");
const pkg = readJson(path.join(ROOT,"package.json")) || {};
log(`  name:    ${pkg.name || "?"}`);
log(`  astro:   ${pkg.dependencies?.astro || pkg.devDependencies?.astro || "?"}`);
log(`  tailwind: ${pkg.devDependencies?.tailwindcss ? "✅" : "❌"}`);
log(`  scripts: ${Object.keys(pkg.scripts||{}).join(", ")}`);
log();

// ── 3. Astro config ───────────────────────────────────────────────
log("── ASTRO CONFIG ─────────────────────────────────────────");
const astroCfg = readTxt(path.join(ROOT,"astro.config.mjs")) || readTxt(path.join(ROOT,"astro.config.ts"));
log(`  tailwind:  ${astroCfg.includes("tailwind") ? "✅" : "❌"}`);
log(`  output:    ${astroCfg.match(/output:\s*['"](\w+)['"]/)?.[1] || "static"}`);
log(`  site:      ${astroCfg.match(/site:\s*['"](.+?)['"]/)?.[1] || "?"}`);
log();

// ── 4. Directory structure ────────────────────────────────────────
log("── DIRECTORY STRUCTURE ──────────────────────────────────");
const dirs = [
  "src/pages","src/components","src/layouts","src/styles",
  "src/data","src/data/build","src/data/build/page-payloads",
  "public","scripts"
];
for (const d of dirs) {
  const p = path.join(ROOT, d);
  log(`  ${exists(p) ? "✅" : "❌"} ${d}`);
}
log();

// ── 5. Pages ──────────────────────────────────────────────────────
log("── PAGES (src/pages/) ───────────────────────────────────");
const pagesDir = path.join(ROOT,"src/pages");
const pageFiles = walkDir(pagesDir, [".astro",".ts",".js"]);
for (const f of pageFiles) {
  const r = rel(f).replace("src/pages/","");
  log(`  ${r}  (${lines(f)} lines)`);
}
log();

// ── 6. Components ─────────────────────────────────────────────────
log("── COMPONENTS (src/components/) ─────────────────────────");
const compDir = path.join(ROOT,"src/components");
const compFiles = walkDir(compDir, [".astro"]);
const byFolder = {};
for (const f of compFiles) {
  const parts = rel(f).replace("src/components/","").split("/");
  const folder = parts.length > 1 ? parts[0] : "root";
  byFolder[folder] = byFolder[folder] || [];
  byFolder[folder].push(parts[parts.length-1]);
}
for (const [folder, files] of Object.entries(byFolder)) {
  log(`  ${folder}/`);
  for (const f of files) log(`    - ${f}`);
}
log();

// ── 7. Layouts ────────────────────────────────────────────────────
log("── LAYOUTS ──────────────────────────────────────────────");
const layoutDir = path.join(ROOT,"src/layouts");
for (const f of walkDir(layoutDir,[".astro"])) {
  log(`  ${rel(f)}  (${lines(f)} lines)`);
}
log();

// ── 8. Styles ─────────────────────────────────────────────────────
log("── STYLES ───────────────────────────────────────────────");
const stylesDir = path.join(ROOT,"src/styles");
for (const f of walkDir(stylesDir)) {
  log(`  ${rel(f)}  (${lines(f)} lines, ${sizeKb(f)} KB)`);
}
log();

// ── 9. Data build files ───────────────────────────────────────────
log("── DATA BUILD (src/data/build/) ─────────────────────────");
const buildDir = path.join(ROOT,"src/data/build");
if (exists(buildDir)) {
  for (const f of fs.readdirSync(buildDir).filter(x=>x.endsWith(".json"))) {
    const full = path.join(buildDir, f);
    const d    = readJson(full);
    const count = Array.isArray(d) ? d.length : (d ? Object.keys(d).length : 0);
    log(`  ${f.padEnd(35)} ${sizeKb(full)} KB  ${count} records`);
  }
  const payloadsDir = path.join(buildDir,"page-payloads");
  if (exists(payloadsDir)) {
    log("  page-payloads/");
    for (const f of fs.readdirSync(payloadsDir).filter(x=>x.endsWith(".json"))) {
      const full  = path.join(payloadsDir, f);
      const d     = readJson(full);
      const count = Array.isArray(d) ? d.length : 0;
      log(`    ${f.padEnd(40)} ${sizeKb(full)} KB  ${count} records`);
    }
  }
} else {
  log("  ❌ src/data/build/ does not exist yet");
}
log();

// ── 10. Data imports check ────────────────────────────────────────
log("── DATA IMPORTS IN PAGES ────────────────────────────────");
for (const f of pageFiles) {
  const content = readTxt(f);
  const imports = [...content.matchAll(/import\s+\w+\s+from\s+["'](@\/data\/[^"']+)["']/g)]
    .map(m => m[1]);
  if (imports.length) {
    log(`  ${rel(f).replace("src/pages/","")}`);
    for (const imp of imports) {
      const impPath = path.join(ROOT, "src", imp.replace("@/",""));
      log(`    ${exists(impPath) ? "✅" : "❌ MISSING"} ${imp}`);
    }
  }
}
log();

// ── 11. Tailwind config ───────────────────────────────────────────
log("── TAILWIND ─────────────────────────────────────────────");
const twCfg = readTxt(path.join(ROOT,"tailwind.config.mjs"))
           || readTxt(path.join(ROOT,"tailwind.config.cjs"))
           || readTxt(path.join(ROOT,"tailwind.config.js"));
if (twCfg) {
  log(`  ✅ tailwind config found (${twCfg.split("\n").length} lines)`);
  const hasCustomColors = twCfg.includes("ai-dark") || twCfg.includes("ai-primary");
  log(`  Custom colors (ai-dark/ai-primary): ${hasCustomColors ? "✅" : "❌"}`);
} else {
  log("  ❌ No tailwind config found");
}
log();

// ── 12. Public assets ─────────────────────────────────────────────
log("── PUBLIC ASSETS ────────────────────────────────────────");
const publicDir = path.join(ROOT,"public");
log(`  _redirects: ${exists(path.join(publicDir,"_redirects")) ? "✅" : "❌"}`);
log(`  robots.txt: ${exists(path.join(publicDir,"robots.txt")) ? "✅" : "❌"}`);
log(`  favicon:    ${exists(path.join(publicDir,"favicon.png")) || exists(path.join(publicDir,"favicon.svg")) || exists(path.join(publicDir,"favicon.ico")) ? "✅" : "❌"}`);
log(`  logos dir:  ${exists(path.join(publicDir,"logos")) ? "✅" : "❌"}`);
log();

// ── 13. homeConfig check ──────────────────────────────────────────
log("── HOME CONFIG ──────────────────────────────────────────");
const homeConfig = readTxt(path.join(ROOT,"src/data/homeConfig.ts"))
               || readTxt(path.join(ROOT,"src/data/homeConfig.js"));
if (homeConfig) {
  log("  ✅ homeConfig found");
  const navLinks = [...homeConfig.matchAll(/href:\s*["']([^"']+)["']/g)].map(m=>m[1]);
  log(`  Nav links: ${navLinks.join(", ")}`);
} else {
  log("  ❌ homeConfig not found");
}
log();

// ── 14. Missing critical files ────────────────────────────────────
log("── MISSING CRITICAL FILES ───────────────────────────────");
const critical = [
  ["src/pages/compare/[slug].astro",      "compare pages (3.053 pagina's)"],
  ["src/pages/alternatives/[slug].astro", "alternatives pages (538 pagina's)"],
  ["src/pages/best/[slug].astro",         "best-of pages (1.080 pagina's)"],
  ["src/pages/use-case/[slug].astro",     "use-case pages (52 pagina's)"],
  ["src/pages/tools/[slug].astro",        "tool detail pages (19k pagina's)"],
  ["src/data/build/page-payloads/compare-pages-rich.json", "compare payload data"],
  ["src/data/build/page-payloads/alternatives-pages.json", "alternatives payload data"],
  ["src/data/build/page-payloads/best-pages.json",         "best-of payload data"],
  ["src/data/build/homepage-data.json",                    "homepage data"],
  ["public/_redirects",                   "Cloudflare 301 redirects"],
  ["src/styles/pages.css",                "page styles"],
];
let allGood = true;
for (const [p, desc] of critical) {
  const ok = exists(path.join(ROOT, p));
  if (!ok) { log(`  ❌ MISSING: ${p}  ← ${desc}`); allGood = false; }
  else log(`  ✅ ${p}`);
}
if (allGood) log("  All critical files present!");
log();

// ── Summary ───────────────────────────────────────────────────────
log("═".repeat(58));
log("SAMENVATTING");
log("─".repeat(58));
log(`  Pages:      ${pageFiles.length}`);
log(`  Components: ${compFiles.length}`);
log(`  Data files: ${exists(buildDir) ? fs.readdirSync(buildDir).filter(x=>x.endsWith(".json")).length : 0} build JSONs`);
log();
log("  Upload audit-output.txt aan Claude voor analyse.");
log("═".repeat(58));
log();

// ── Write output file ─────────────────────────────────────────────
fs.writeFileSync(path.join(ROOT,"audit-output.txt"), out.join("\n"), "utf8");
console.log("\n✅ audit-output.txt opgeslagen — upload dit aan Claude.\n");
