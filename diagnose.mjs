/**
 * diagnose.mjs — zet in ROOT van AI_Experts_Repo, run: node diagnose.mjs
 * Checkt exact wat er in de data zit en waarom pagina's broken zijn.
 */

import fs   from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
function rj(p) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8")); } catch { return null; } }
function ex(p) { return fs.existsSync(path.join(ROOT, p)); }

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  AIExpertsCorner — Data Diagnose                        ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

// ── 1. Check split tools dir ──────────────────────────────────────
const toolsDir = path.join(ROOT, "src/data/build/tools");
const toolFiles = fs.existsSync(toolsDir)
  ? fs.readdirSync(toolsDir).filter(f => f.endsWith(".json") && !f.startsWith("_"))
  : [];
console.log(`Split tools dir: ${fs.existsSync(toolsDir) ? "✅" : "❌"} (${toolFiles.length} files)`);

// ── 2. Sample 5 tools — what fields do they have? ─────────────────
const sampleSlugs = ["chatgpt", "claude", "midjourney", toolFiles[0]?.replace(".json",""), toolFiles[100]?.replace(".json","")].filter(Boolean);
console.log("\n📋 TOOL DATA SAMPLE:");

for (const slug of sampleSlugs) {
  const t = rj(`src/data/build/tools/${slug}.json`);
  if (!t) { console.log(`  ❌ ${slug}: file missing`); continue; }
  
  const fields = {
    name:        t.display_name || t.name || "❌ MISSING",
    logo_url:    t.logo_url ? "✅" : "❌",
    logo_domain: t.logo_domain || "❌",
    pricing:     t.pricing_tier || "❌",
    category:    t.category || "❌",
    description: (t.long_description || t.description || t.short_description || "")?.slice(0,60) || "❌",
    use_cases:   Array.isArray(t.use_cases) ? t.use_cases.length : "❌",
    faq_items:   Array.isArray(t.faq_items) ? t.faq_items.length : 0,
    pros:        Array.isArray(t.pros) ? t.pros.length : 0,
    compare_candidates: Array.isArray(t.compare_candidates) ? t.compare_candidates.length : 0,
    website_url: t.website_url || t.url || "❌",
    field_count: Object.keys(t).length,
    all_keys:    Object.keys(t).join(", "),
  };
  
  console.log(`\n  [${slug}]`);
  for (const [k, v] of Object.entries(fields)) {
    console.log(`    ${k.padEnd(22)} ${v}`);
  }
}

// ── 3. Check logo-map ─────────────────────────────────────────────
const logoMap = rj("src/data/build/logo-map.json");
console.log(`\n📸 LOGO MAP:`);
console.log(`  exists: ${logoMap ? "✅" : "❌"}`);
if (logoMap) {
  const keys = Object.keys(logoMap);
  const filled = Object.values(logoMap).filter(v => v && v.length > 5).length;
  console.log(`  total:  ${keys.length}`);
  console.log(`  filled: ${filled} (${Math.round(filled/keys.length*100)}%)`);
  for (const s of sampleSlugs) {
    console.log(`  ${s.padEnd(20)} ${logoMap[s] || "❌ MISSING"}`);
  }
}

// ── 4. Check tool-slugs.json ──────────────────────────────────────
const slugs = rj("src/data/build/tool-slugs.json");
console.log(`\n📝 TOOL-SLUGS.JSON: ${slugs ? `✅ (${slugs.length} slugs)` : "❌ MISSING"}`);

// ── 5. Compare pages payload ──────────────────────────────────────
const comparePg = rj("src/data/build/page-payloads/compare-pages-rich.json");
if (comparePg?.[0]) {
  const c = comparePg[0];
  console.log(`\n🔄 COMPARE PAGE SAMPLE [${c.route}]:`);
  console.log(`  tool_a slug:    ${c.tool_a?.slug}`);
  console.log(`  tool_a name:    ${c.tool_a?.name}`);
  console.log(`  tool_a logo:    ${c.tool_a?.logo_url || "❌"}`);
  console.log(`  tool_b slug:    ${c.tool_b?.slug}`);
  console.log(`  has verdict:    ${c.comparison?.verdict ? "✅" : "❌"}`);
  console.log(`  has faqs:       ${c.comparison?.faqs?.length || 0}`);
}

// ── 6. Alternatives payload ───────────────────────────────────────
const altPg = rj("src/data/build/page-payloads/alternatives-pages.json");
if (altPg?.[0]) {
  const a = altPg[0];
  console.log(`\n🔀 ALTERNATIVES PAGE SAMPLE [${a.route}]:`);
  console.log(`  seed tool:      ${a.seed_tool?.name || a.seed_tool?.slug}`);
  console.log(`  seed logo:      ${a.seed_tool?.logo_url || "❌"}`);
  console.log(`  alternatives:   ${a.alternatives?.length || 0}`);
  console.log(`  alt[0] logo:    ${a.alternatives?.[0]?.logo_url || "❌"}`);
}

// ── 7. Best pages ─────────────────────────────────────────────────
const bestPg = rj("src/data/build/page-payloads/best-pages.json");
if (bestPg?.[0]) {
  const b = bestPg[0];
  console.log(`\n⭐ BEST PAGE SAMPLE [${b.route}]:`);
  console.log(`  entity:         ${b.slug}`);
  console.log(`  tools count:    ${b.top_tools?.length || 0}`);
  console.log(`  tool[0] logo:   ${b.top_tools?.[0]?.logo_url || "❌"}`);
}

// ── 8. Homepage data ──────────────────────────────────────────────
const hp = rj("src/data/build/homepage-data.json");
if (hp) {
  console.log(`\n🏠 HOMEPAGE DATA:`);
  console.log(`  keys:           ${Object.keys(hp).join(", ")}`);
  console.log(`  total_tools:    ${hp.total_tools}`);
  console.log(`  featured count: ${hp.featured_tools?.length || 0}`);
  console.log(`  popular count:  ${hp.popular_tools?.length || 0}`);
  const t0 = hp.featured_tools?.[0] || hp.popular_tools?.[0];
  if (t0) {
    console.log(`  sample tool:    ${t0.name||t0.slug}`);
    console.log(`  sample logo:    ${t0.logo_url || "❌"}`);
    console.log(`  sample keys:    ${Object.keys(t0).join(", ")}`);
  }
}

// ── 9. What fields exist in enriched pipeline data? ───────────────
const enrichedPath = path.join(ROOT, "../AI_Experts_ENRICH_PIPELINE/src/data/derived/tools.enriched.json");
if (fs.existsSync(enrichedPath)) {
  try {
    const raw = fs.readFileSync(enrichedPath, "utf8");
    const tools = JSON.parse(raw);
    const t = tools.find(t => t.slug === "chatgpt") || tools[0];
    console.log(`\n🔬 ENRICHED PIPELINE DATA (chatgpt):`);
    console.log(`  total tools: ${tools.length}`);
    console.log(`  fields (${Object.keys(t).length}): ${Object.keys(t).join(", ")}`);
    console.log(`  logo_url:    ${t.logo_url || "❌"}`);
    console.log(`  logo_domain: ${t.logo_domain || "❌"}`);
    console.log(`  faq_items:   ${Array.isArray(t.faq_items) ? t.faq_items.length : "❌"}`);
    console.log(`  pros:        ${Array.isArray(t.pros) ? t.pros.length : "❌"}`);
    console.log(`  long_desc:   ${t.long_description?.slice(0,80) || "❌"}`);
  } catch(e) {
    console.log(`\n🔬 ENRICHED PIPELINE: could not read (${e.message})`);
  }
} else {
  console.log(`\n🔬 ENRICHED PIPELINE: not found at ${enrichedPath}`);
}

// ── Summary ───────────────────────────────────────────────────────
console.log("\n" + "═".repeat(58));
console.log("✅ Diagnose klaar — kopieer deze output en stuur aan Claude");
console.log("═".repeat(58) + "\n");
