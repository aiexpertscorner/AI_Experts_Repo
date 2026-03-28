#!/usr/bin/env node
/**
 * audit-hub-indexes.mjs
 * AIExpertsCorner — Hub Index Page Auditor
 *
 * Checks all hub index pages for:
 *   - Inline <style> blocks with hardcoded colors
 *   - Missing CSS imports
 *   - Missing hub modifier classes
 *   - Hardcoded hex values in templates
 *   - Data source consistency
 *
 * Usage:
 *   node audit-hub-indexes.mjs
 *   node audit-hub-indexes.mjs --fix    (applies safe auto-fixes)
 *   node audit-hub-indexes.mjs --json   (outputs JSON report)
 *
 * Repo: E:\2026_Github\AI_Experts_V3_PROD\AI_Experts_Repo
 */

import fs   from "node:fs";
import path from "node:path";

const ROOT     = path.resolve("E:/2026_Github/AI_Experts_V3_PROD/AI_Experts_Repo");
const PAGES    = path.join(ROOT, "src/pages");
const STYLES   = path.join(ROOT, "src/styles");
const DATA     = path.join(ROOT, "src/data/build");
const FIX_MODE = process.argv.includes("--fix");
const JSON_OUT = process.argv.includes("--json");

// ── Config ────────────────────────────────────────────────────────────────────

const HUB_PAGES = [
  {
    id:        "tools",
    file:      "tools/index.astro",
    cssImport: "@/styles/home.css",       // uses home.css + layout.css
    dataFiles: ["category-map.json", "featured-tools.json", "homepage-data.json", "logo-map.json"],
    modifier:  null,                       // tools doesn't use .hub modifier
  },
  {
    id:        "compare",
    file:      "compare/index.astro",
    cssImport: "@/styles/hub-listings.css",
    dataFiles: ["compare-pairs.json", "logo-map.json"],
    modifier:  "hub--blue",
  },
  {
    id:        "alternatives",
    file:      "alternatives/index.astro",
    cssImport: "@/styles/hub-listings.css",
    dataFiles: ["page-payloads/alternatives-pages.json", "logo-map.json"],
    modifier:  "hub--green",
  },
  {
    id:        "best",
    file:      "best/index.astro",
    cssImport: "@/styles/hub-listings.css",
    dataFiles: ["page-payloads/best-pages.json", "logo-map.json"],
    modifier:  "hub--amber",
  },
  {
    id:        "use-case",
    file:      "use-case/index.astro",
    cssImport: "@/styles/hub-listings.css",
    dataFiles: ["page-payloads/use-case-cluster-pages.json", "logo-map.json"],
    modifier:  null,                       // uses .uc-hub not .hub
  },
];

const REQUIRED_CSS_FILES = [
  "tokens.css",
  "base.css",
  "layout.css",
  "components.css",
  "home.css",
  "hub-listings.css",
  "taxonomy.css",
  "tool-detail.css",
  "pages.css",
];

const HEX_PATTERN      = /#[0-9A-Fa-f]{3,8}\b/g;
const HARDCODED_COLORS = ["#0F172A","#1E293B","#F8FAFC","#94A3B8","#64748B","#3B82F6","#CBD5E1"];

// ── Result collector ──────────────────────────────────────────────────────────

const results = {
  timestamp: new Date().toISOString(),
  summary:   { total: 0, pass: 0, warn: 0, error: 0, fixed: 0 },
  pages:     {},
  cssFiles:  {},
  dataFiles: {},
};

function addIssue(scope, level, code, message, fixable = false) {
  if (!results.pages[scope]) results.pages[scope] = { issues: [] };
  results.pages[scope].issues.push({ level, code, message, fixable });
  results.summary[level === "error" ? "error" : "warn"]++;
  results.summary.total++;
}

// ── CSS file checks ───────────────────────────────────────────────────────────

function checkCssFiles() {
  if (!JSON_OUT) console.log("\n── CSS files ─────────────────────────────────");

  for (const file of REQUIRED_CSS_FILES) {
    const full = path.join(STYLES, file);
    const exists = fs.existsSync(full);
    results.cssFiles[file] = { exists };

    if (!JSON_OUT) {
      console.log(`  ${exists ? "✓" : "✗"} ${file}${exists ? "" : " — MISSING"}`);
    }
  }
}

// ── Data file checks ──────────────────────────────────────────────────────────

function checkDataFile(relPath) {
  const full = path.join(DATA, relPath);
  if (!fs.existsSync(full)) {
    results.dataFiles[relPath] = { exists: false, entries: 0 };
    return null;
  }
  try {
    const raw  = fs.readFileSync(full, "utf8");
    const data = JSON.parse(raw);
    const entries = Array.isArray(data) ? data.length : Object.keys(data).length;
    results.dataFiles[relPath] = { exists: true, entries, sizeKB: Math.round(raw.length / 1024) };
    return data;
  } catch {
    results.dataFiles[relPath] = { exists: true, entries: 0, error: "parse error" };
    return null;
  }
}

// ── Page analysis ─────────────────────────────────────────────────────────────

function analyzePage(cfg) {
  const fullPath = path.join(PAGES, cfg.file);
  results.pages[cfg.id] = { file: cfg.file, issues: [], fixes: [] };

  if (!fs.existsSync(fullPath)) {
    addIssue(cfg.id, "error", "MISSING_FILE", `File not found: ${fullPath}`);
    return;
  }

  let src = fs.readFileSync(fullPath, "utf8");
  let modified = false;

  // 1. Inline <style> check
  const inlineStyleMatch = src.match(/<style[\s\S]*?<\/style>/g);
  if (inlineStyleMatch) {
    const hexMatches = inlineStyleMatch.join("").match(HEX_PATTERN) || [];
    const hardcoded  = hexMatches.filter(h => HARDCODED_COLORS.includes(h.toUpperCase()));
    if (hardcoded.length > 0) {
      addIssue(cfg.id, "error", "INLINE_HARDCODED",
        `Inline <style> contains ${hardcoded.length} hardcoded colors: ${[...new Set(hardcoded)].slice(0,5).join(", ")}`,
        true);
    } else if (inlineStyleMatch.length > 0) {
      addIssue(cfg.id, "warn", "INLINE_STYLE",
        `Has ${inlineStyleMatch.length} inline <style> block(s) — should be extracted to CSS file`,
        false);
    }
  }

  // 2. CSS import check
  if (cfg.cssImport && !src.includes(cfg.cssImport)) {
    addIssue(cfg.id, "error", "MISSING_CSS_IMPORT",
      `Missing import: ${cfg.cssImport}`,
      true);

    if (FIX_MODE && cfg.cssImport === "@/styles/hub-listings.css") {
      // Auto-inject import after last existing import statement
      src = src.replace(
        /(import\s+["'][^"']+["'];?\s*\n)(?!import)/,
        `$1import "${cfg.cssImport}";\n`
      );
      modified = true;
      results.pages[cfg.id].fixes.push("Injected hub-listings.css import");
    }
  }

  // 3. Hub modifier class check
  if (cfg.modifier) {
    const classPattern = new RegExp(`class=["'][^"']*${cfg.modifier}[^"']*["']`);
    if (!classPattern.test(src)) {
      addIssue(cfg.id, "warn", "MISSING_MODIFIER",
        `Wrapper div missing modifier class: .${cfg.modifier}`,
        true);
    }
  }

  // 4. Clearbit URL check
  const clearbitCount = (src.match(/logo\.clearbit\.com/g) || []).length;
  if (clearbitCount > 0) {
    addIssue(cfg.id, "error", "CLEARBIT_URL",
      `Found ${clearbitCount} Clearbit URL(s) — should use logo-map.json only`);
  }

  // 5. Data file checks
  for (const df of cfg.dataFiles) {
    const data = checkDataFile(df);
    if (!data) {
      addIssue(cfg.id, "error", "MISSING_DATA",
        `Data file not found or unreadable: ${df}`);
    } else {
      const count = Array.isArray(data) ? data.length : Object.keys(data).length;
      if (count === 0) {
        addIssue(cfg.id, "error", "EMPTY_DATA", `Data file is empty: ${df}`);
      }
    }
  }

  // 6. Hardcoded hex in template (outside style tags)
  const noStyle = src.replace(/<style[\s\S]*?<\/style>/g, "");
  const templateHex = (noStyle.match(HEX_PATTERN) || [])
    .filter(h => HARDCODED_COLORS.includes(h.toUpperCase()));
  if (templateHex.length > 0) {
    addIssue(cfg.id, "warn", "TEMPLATE_HEX",
      `${templateHex.length} hardcoded hex values in template HTML: ${[...new Set(templateHex)].slice(0,5).join(", ")}`);
  }

  // 7. Check for <style is:global> vs <style>
  if (src.includes('<style is:global>')) {
    addIssue(cfg.id, "warn", "GLOBAL_STYLE",
      `Uses <style is:global> — ensure this is intentional and tokens are available`);
  }

  // 8. getStaticPaths check for index pages (should NOT have it)
  if (src.includes("getStaticPaths") && cfg.file.includes("index.astro")) {
    addIssue(cfg.id, "warn", "STATIC_PATHS_ON_INDEX",
      `index.astro has getStaticPaths() — this is unusual for an index page`);
  }

  // 9. Schema/structured data check
  if (!src.includes("application/ld+json")) {
    addIssue(cfg.id, "warn", "NO_SCHEMA",
      `No JSON-LD structured data found — consider adding ItemList or WebPage schema`);
  }

  // 10. SEO meta check
  if (!src.includes("description") && !src.includes("pageDesc")) {
    addIssue(cfg.id, "warn", "NO_META_DESC", `No meta description found`);
  }

  // Write fixes if in fix mode
  if (FIX_MODE && modified) {
    fs.writeFileSync(fullPath, src, "utf8");
    results.summary.fixed++;
    if (!JSON_OUT) console.log(`  ✎ Fixed: ${cfg.file}`);
  }

  results.summary.pass += results.pages[cfg.id].issues.length === 0 ? 1 : 0;
}

// ── Render report ─────────────────────────────────────────────────────────────

function renderReport() {
  if (JSON_OUT) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         AIExpertsCorner — Hub Index Audit Report         ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // CSS files
  const missingCss = Object.entries(results.cssFiles).filter(([,v]) => !v.exists);
  if (missingCss.length) {
    console.log("⚠ MISSING CSS FILES:");
    missingCss.forEach(([f]) => console.log(`   ✗  ${f}`));
    console.log();
  }

  // Data files
  console.log("── Data files ─────────────────────────────────────────────");
  for (const [file, info] of Object.entries(results.dataFiles)) {
    const status = !info.exists ? "✗ MISSING" : `✓ ${info.entries?.toLocaleString()} entries (${info.sizeKB}KB)`;
    console.log(`   ${status.padEnd(36)} ${file}`);
  }
  console.log();

  // Per-page results
  console.log("── Page results ────────────────────────────────────────────");
  for (const [id, page] of Object.entries(results.pages)) {
    const issues = page.issues;
    const errors = issues.filter(i => i.level === "error");
    const warns  = issues.filter(i => i.level === "warn");
    const status = errors.length ? "✗" : warns.length ? "⚠" : "✓";
    const label  = `${status} //${id === "tools" ? "tools" : id}/index`;
    console.log(`\n  ${label}`);
    if (issues.length === 0) {
      console.log("     ✓ No issues found");
    } else {
      issues.forEach(issue => {
        const icon = issue.level === "error" ? "  ERR" : " WARN";
        const fix  = issue.fixable ? " [auto-fixable]" : "";
        console.log(`    ${icon}  [${issue.code}]${fix}`);
        console.log(`          ${issue.message}`);
      });
    }
  }

  // Summary
  console.log("\n── Summary ─────────────────────────────────────────────────");
  console.log(`   Total issues : ${results.summary.total}`);
  console.log(`   Errors       : ${results.summary.error}`);
  console.log(`   Warnings     : ${results.summary.warn}`);
  if (FIX_MODE) console.log(`   Auto-fixed   : ${results.summary.fixed}`);
  console.log();

  if (!FIX_MODE && (results.summary.error > 0)) {
    console.log("  Run with --fix to apply auto-fixable changes.");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

checkCssFiles();
for (const cfg of HUB_PAGES) {
  analyzePage(cfg);
}
renderReport();

process.exit(results.summary.error > 0 ? 1 : 0);
