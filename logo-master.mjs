/**
 * logo-master.mjs — AIExpertsCorner Logo Master Script
 * ─────────────────────────────────────────────────────────────────
 * Fase 1 — AUDIT:    scan alle .astro/.ts/.js bestanden op
 *                    clearbit/logo.dev/logo_url referenties
 * Fase 2 — GENERATE: bouw logo-map.json uit logos.json
 *                    Prioriteit: tool_logo (verified) → company_logo → null
 * Fase 3 — REPORT:   coverage, missende slugs, aanbevelingen
 *
 * Gebruik:
 *   node logo-master.mjs                  ← alles draaien
 *   node logo-master.mjs --audit          ← alleen audit
 *   node logo-master.mjs --generate       ← alleen logo-map bouwen
 *   node logo-master.mjs --check chatgpt  ← check één tool
 */

import fs   from "node:fs";
import path from "node:path";

const ROOT      = process.cwd();
const LOGOS_SRC = path.join(ROOT, "src/data/build/logos.json");
const MAP_OUT   = path.join(ROOT, "src/data/build/logo-map.json");
const SLUGS_SRC = path.join(ROOT, "src/data/build/tool-slugs.json");

const argv      = process.argv.slice(2);
const doAudit   = argv.includes("--audit")    || argv.length === 0;
const doGen     = argv.includes("--generate") || argv.length === 0;
const checkIdx  = argv.indexOf("--check");
const checkSlug = checkIdx !== -1 ? argv[checkIdx + 1] : null;

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  AIExpertsCorner — Logo Master Script                   ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

// ══════════════════════════════════════════════════════════════════
// FASE 1 — AUDIT
// ══════════════════════════════════════════════════════════════════
if (doAudit) {
  console.log("━━━ FASE 1: AUDIT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const SCAN_DIRS = ["src/pages", "src/components", "src/layouts"];
  const SCAN_EXT  = [".astro", ".ts", ".js", ".mjs"];

  const LOGO_PATTERNS = [
    { pattern: /clearbit\.com/g,   label: "Clearbit" },
    { pattern: /logo\.dev/g,       label: "logo.dev" },
    { pattern: /logo_url/g,        label: "logo_url field" },
    { pattern: /logo_domain/g,     label: "logo_domain field" },
    { pattern: /logo-map\.json/g,  label: "logo-map.json import" },
    { pattern: /logoMap\[/g,       label: "logoMap[] lookup" },
    { pattern: /\.charAt\(0\)/g,   label: "charAt(0) fallback" },
  ];

  function walkDir(dir) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) return [];
    const results = [];
    for (const e of fs.readdirSync(full, { withFileTypes: true })) {
      const rel = path.join(dir, e.name).replace(/\\/g, "/");
      if (e.isDirectory()) {
        results.push(...walkDir(rel));
      } else if (SCAN_EXT.some(ext => e.name.endsWith(ext))) {
        results.push(rel);
      }
    }
    return results;
  }

  const files = SCAN_DIRS.flatMap(d => walkDir(d));
  console.log(`  Bestanden gescand: ${files.length}\n`);

  const findings = {};

  for (const rel of files) {
    const content = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const lines   = content.split("\n");
    const fileMatches = [];

    for (const { pattern, label } of LOGO_PATTERNS) {
      const matchLines = [];
      lines.forEach((line, i) => {
        if (pattern.test(line)) {
          matchLines.push(`L${i + 1}: ${line.trim().slice(0, 90)}`);
        }
        pattern.lastIndex = 0; // reset global regex
      });
      if (matchLines.length) {
        fileMatches.push({ label, count: matchLines.length, lines: matchLines });
      }
    }

    if (fileMatches.length) {
      findings[rel] = { file: rel, matches: fileMatches };
    }
  }

  // Categorise
  const clearbitFiles = Object.entries(findings).filter(([, v]) =>
    v.matches.some(m => m.label === "Clearbit")
  );
  const logoDevFiles  = Object.entries(findings).filter(([, v]) =>
    v.matches.some(m => m.label === "logo.dev")
  );
  const charAtFiles   = Object.entries(findings).filter(([, v]) =>
    v.matches.some(m => m.label === "charAt(0) fallback")
  );
  const logoMapFiles  = Object.entries(findings).filter(([, v]) =>
    v.matches.some(m => m.label === "logo-map.json import")
  );
  const needsFix = clearbitFiles.filter(([f]) =>
    !logoMapFiles.some(([g]) => g === f)
  );

  console.log("  📋 SAMENVATTING:\n");
  console.log(`  Clearbit referenties:      ${clearbitFiles.length} bestanden`);
  console.log(`  logo.dev referenties:      ${logoDevFiles.length} bestanden`);
  console.log(`  charAt(0) fallbacks:       ${charAtFiles.length} bestanden`);
  console.log(`  logo-map.json geïmporteerd:${logoMapFiles.length} bestanden`);
  console.log(`  Clearbit zonder logo-map:  ${needsFix.length} bestanden ← FIX NODIG\n`);

  if (needsFix.length) {
    console.log("  ❌ BESTANDEN MET CLEARBIT MAAR GEEN logo-map import:");
    needsFix.forEach(([f]) => console.log(`     ${f}`));
    console.log("");
  }

  if (charAtFiles.length) {
    console.log("  ⚠️  BESTANDEN MET charAt(0) FALLBACK (moet volledige naam worden):");
    charAtFiles.forEach(([f]) => console.log(`     ${f}`));
    console.log("");
  }

  // Detail per bestand
  console.log("  📄 DETAIL (alleen logo/clearbit hits):");
  for (const [file, { matches }] of Object.entries(findings)) {
    const interesting = matches.filter(m =>
      m.label === "Clearbit" || m.label === "logo.dev" || m.label === "charAt(0) fallback"
    );
    if (!interesting.length) continue;
    console.log(`\n  ${file}`);
    for (const m of interesting) {
      console.log(`    [${m.label}] ×${m.count}`);
      m.lines.slice(0, 2).forEach(l => console.log(`      ${l}`));
    }
  }

  fs.writeFileSync(
    path.join(ROOT, "logo-audit.json"),
    JSON.stringify({
      generated: new Date().toISOString(),
      summary: {
        scanned_files: files.length,
        clearbit_files: clearbitFiles.map(([f]) => f),
        logo_dev_files: logoDevFiles.map(([f]) => f),
        charAt_fallback_files: charAtFiles.map(([f]) => f),
        logo_map_imported_files: logoMapFiles.map(([f]) => f),
        needs_fix: needsFix.map(([f]) => f),
      },
      details: findings,
    }, null, 2)
  );

  console.log(`\n  ✅ logo-audit.json geschreven\n`);
}

// ══════════════════════════════════════════════════════════════════
// FASE 2 — GENERATE logo-map.json
// ══════════════════════════════════════════════════════════════════
if (doGen) {
  console.log("━━━ FASE 2: GENERATE logo-map.json ━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (!fs.existsSync(LOGOS_SRC)) {
    console.error(`  ❌ logos.json niet gevonden op: ${LOGOS_SRC}`);
    console.error(`     Verwacht in src/data/build/logos.json`);
    process.exit(1);
  }

  const logosData = JSON.parse(fs.readFileSync(LOGOS_SRC, "utf8"));
  const items     = logosData.items || (Array.isArray(logosData) ? logosData : []);
  console.log(`  logos.json records:  ${items.length}`);

  // Laad bestaande map om niet-logos.json entries te bewaren
  const existingMap = fs.existsSync(MAP_OUT)
    ? JSON.parse(fs.readFileSync(MAP_OUT, "utf8"))
    : {};
  console.log(`  Bestaande logo-map:  ${Object.keys(existingMap).length} entries`);

  const allSlugs = fs.existsSync(SLUGS_SRC)
    ? JSON.parse(fs.readFileSync(SLUGS_SRC, "utf8"))
    : [];
  console.log(`  Totaal tool slugs:   ${allSlugs.length}\n`);

  // Start met bestaande map, overschrijf met verified data
  const newMap = Object.assign({}, existingMap);

  let fromTool    = 0;
  let fromCompany = 0;
  let noLogo      = 0;

  for (const item of items) {
    const slug = item.slug || item.id;
    if (!slug) continue;

    // Prioriteit: verified tool_logo → verified company_logo → behoud bestaande
    if (item.verification && item.verification.tool_logo_ok && item.tool_logo) {
      newMap[slug] = item.tool_logo;
      fromTool++;
    } else if (item.verification && item.verification.company_logo_ok && item.company_logo) {
      newMap[slug] = item.company_logo;
      fromCompany++;
    } else {
      noLogo++;
      // existingMap entry blijft bewaard door Object.assign hierboven
    }
  }

  fs.writeFileSync(MAP_OUT, JSON.stringify(newMap, null, 0), "utf8");

  const total    = Object.keys(newMap).length;
  const coverage = allSlugs.length > 0
    ? Math.round(total / allSlugs.length * 100)
    : 0;

  console.log(`  ✅ logo-map.json geschreven: ${MAP_OUT}`);
  console.log(`  Totaal entries:      ${total}`);
  console.log(`  ↳ tool_logo (best):  ${fromTool}`);
  console.log(`  ↳ company_logo:      ${fromCompany}`);
  console.log(`  ↳ geen (in batch):   ${noLogo}`);
  console.log(`  Coverage:            ${coverage}% van ${allSlugs.length} slugs\n`);

  const missing = allSlugs.filter(s => !newMap[s]);
  if (missing.length) {
    console.log(`  ⚠️  Tools zonder logo in map: ${missing.length}`);
    missing.slice(0, 10).forEach(s => console.log(`     ${s}`));
    if (missing.length > 10) console.log(`     ... en ${missing.length - 10} meer`);

    fs.writeFileSync(
      path.join(ROOT, "logo-missing.json"),
      JSON.stringify({ count: missing.length, slugs: missing }, null, 2)
    );
    console.log(`\n  Volledige lijst: logo-missing.json\n`);
  } else {
    console.log(`  ✅ Alle slugs hebben een logo!\n`);
  }
}

// ══════════════════════════════════════════════════════════════════
// FASE 3 — CHECK één slug
// ══════════════════════════════════════════════════════════════════
if (checkSlug) {
  console.log(`\n━━━ CHECK: ${checkSlug} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const logoMap = fs.existsSync(MAP_OUT)
    ? JSON.parse(fs.readFileSync(MAP_OUT, "utf8"))
    : {};

  const entry = logoMap[checkSlug];
  console.log(`  logo-map entry:     ${entry || "❌ niet gevonden"}`);

  if (fs.existsSync(LOGOS_SRC)) {
    const data   = JSON.parse(fs.readFileSync(LOGOS_SRC, "utf8"));
    const items  = data.items || (Array.isArray(data) ? data : []);
    const record = items.find(i => (i.slug || i.id) === checkSlug);

    if (record) {
      console.log(`\n  logos.json record:`);
      console.log(`    tool_logo:       ${record.tool_logo || "—"}`);
      console.log(`    tool_logo_ok:    ${record.verification ? record.verification.tool_logo_ok : "?"}`);
      console.log(`    company_logo:    ${record.company_logo || "—"}`);
      console.log(`    company_logo_ok: ${record.verification ? record.verification.company_logo_ok : "?"}`);
      console.log(`    tool_domain:     ${record.tool_domain || record.company_domain || "—"}`);
    } else {
      console.log(`\n  ⚠️  Niet gevonden in logos.json`);
    }
  }
}

// ══════════════════════════════════════════════════════════════════
// KLAAR
// ══════════════════════════════════════════════════════════════════
console.log("━━━ KLAAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
console.log("  Volgende stappen:");
console.log("  1. Bekijk logo-audit.json → welke bestanden need fix");
console.log("  2. ToolLogo.astro (design-pack) gebruikt logo-map.json automatisch");
console.log("  3. Als logos.json groeit: node logo-master.mjs --generate");
console.log("  4. Check één tool:        node logo-master.mjs --check chatgpt\n");
