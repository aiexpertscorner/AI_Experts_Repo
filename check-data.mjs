// check-data.mjs — zet in root, run: node check-data.mjs
import fs   from "node:fs";
import path from "node:path";

console.log("=".repeat(60));
console.log("AIExpertsCorner — Data Layer Check");
console.log("=".repeat(60));

// ── 1. Tool file structuur ────────────────────────────────────────
console.log("\n1. TOOL FILE STRUCTUUR (chatgpt.json)");
const toolFile = "src/data/build/tools/chatgpt.json";
if (fs.existsSync(toolFile)) {
  const d = JSON.parse(fs.readFileSync(toolFile, "utf8"));
  const keys = Object.keys(d);
  console.log("  Keys:", keys.join(", "));
  console.log("  hero.name:", d.hero?.name || "MISSING");
  console.log("  hero.logo_domain:", d.hero?.logo_domain || "MISSING");
  console.log("  hero.website_url:", d.hero?.website_url || "MISSING");
  console.log("  taxonomy.category:", d.taxonomy?.category || "MISSING");
  console.log("  taxonomy.capabilities:", JSON.stringify(d.taxonomy?.capabilities?.slice(0,5) || []));
  console.log("  taxonomy.industries:", JSON.stringify(d.taxonomy?.industries?.slice(0,3) || []));
  console.log("  taxonomy.use_cases:", JSON.stringify(d.taxonomy?.use_cases?.slice(0,3) || []));
  console.log("  content.description:", (d.content?.description || "").slice(0,80) || "MISSING");
  console.log("  content.long_description:", (d.content?.long_description || "").slice(0,80) || "MISSING");
  console.log("  content.pros:", JSON.stringify(d.content?.pros?.slice(0,2) || []));
  console.log("  content.unique_features:", JSON.stringify(d.content?.unique_features?.slice(0,2) || []));
  console.log("  discovery.faq_items count:", d.discovery?.faq_items?.length || 0);
  console.log("  discovery.workflow_snippets count:", d.discovery?.workflow_snippets?.length || 0);
  console.log("  related.alternatives count:", d.related?.alternatives?.length || 0);
  console.log("  commercial.pricing_tier:", d.commercial?.pricing_tier || "MISSING");
  console.log("  seo.title:", d.seo?.title || "MISSING");
  console.log("  seo.description:", (d.seo?.description || "").slice(0,80) || "MISSING");
} else {
  console.log("  ❌ chatgpt.json niet gevonden — split script niet gedraaid?");
}

// ── 2. Sample 5 random tool files ────────────────────────────────
console.log("\n2. SAMPLE 5 TOOLS — content completeness");
const toolsDir = "src/data/build/tools";
if (fs.existsSync(toolsDir)) {
  const files = fs.readdirSync(toolsDir).filter(f => f.endsWith(".json"));
  console.log("  Total tool files:", files.length);
  
  const sample = ["chatgpt.json", "github-copilot.json", "midjourney.json", "jasper.json", "canva-ai.json"];
  for (const fname of sample) {
    const fp = path.join(toolsDir, fname);
    if (!fs.existsSync(fp)) { console.log("  ⚠️ ", fname, "not found"); continue; }
    const d = JSON.parse(fs.readFileSync(fp, "utf8"));
    const hasDesc   = !!(d.content?.description || d.content?.long_description);
    const hasFAQ    = (d.discovery?.faq_items?.length || 0) > 0;
    const hasPros   = (d.content?.pros?.length || 0) > 0;
    const hasAlts   = (d.related?.alternatives?.length || 0) > 0;
    const hasCaps   = (d.taxonomy?.capabilities?.length || 0) > 0;
    console.log(
      " ", fname.padEnd(25),
      "desc:", hasDesc ? "✅" : "❌",
      "faq:", hasFAQ ? "✅" : "❌",
      "pros:", hasPros ? "✅" : "❌",
      "alts:", hasAlts ? "✅" : "❌",
      "caps:", hasCaps ? "✅" : "❌"
    );
  }
} else {
  console.log("  ❌ src/data/build/tools/ map bestaat niet");
}

// ── 3. Hub index pages ────────────────────────────────────────────
console.log("\n3. HUB INDEX PAGES");
const hubs = [
  "src/pages/alternatives/index.astro",
  "src/pages/compare/index.astro",
  "src/pages/best/index.astro",
  "src/pages/capability/index.astro",
  "src/pages/industry/index.astro",
  "src/pages/workflow/index.astro",
  "src/pages/subcategory/index.astro",
  "src/pages/tag/index.astro",
  "src/pages/use-case/index.astro",
];
for (const h of hubs) {
  const exists = fs.existsSync(h);
  if (!exists) { console.log("  ❌ MISSING:", h); continue; }
  const content = fs.readFileSync(h, "utf8");
  const lines   = content.split("\n").length;
  const hasDead = content.includes(".json") && content.includes("href");
  const hasImport = content.includes('from "@/data/build/page-payloads/');
  console.log(
    "  ✅", h.replace("src/pages/", "").padEnd(35),
    lines + " lines",
    hasImport ? "" : "⚠️ NO payload import",
    hasDead ? "⚠️ has .json in href" : ""
  );
}

// ── 4. tool-pages-rich.json structuur ────────────────────────────
console.log("\n4. TOOL-PAGES-RICH.JSON STRUCTUUR");
const richFile = "src/data/build/page-payloads/tool-pages-rich.json";
if (fs.existsSync(richFile)) {
  const size = Math.round(fs.statSync(richFile).size / 1024 / 1024);
  console.log("  File size:", size, "MB");
  // Read only first 8KB
  const fd  = fs.openSync(richFile, "r");
  const buf = Buffer.alloc(8192);
  fs.readSync(fd, buf, 0, 8192, 0);
  fs.closeSync(fd);
  const raw = buf.toString("utf8");
  const firstBrace = raw.indexOf("{");
  const lastBrace  = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const obj = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      console.log("  Keys:", Object.keys(obj).join(", "));
      console.log("  hero.name:", obj.hero?.name || obj.name || "?");
      console.log("  content.description:", (obj.content?.description || obj.description || "").slice(0, 80));
      console.log("  discovery.faq_items:", obj.discovery?.faq_items?.length || 0);
    } catch {
      // Try top-level array
      const arr = raw.match(/\{[^{}]+\}/)?.[0];
      if (arr) console.log("  First record keys:", Object.keys(JSON.parse(arr)).join(", "));
    }
  }
} else {
  console.log("  ❌ tool-pages-rich.json niet gevonden");
}

// ── 5. Pipeline status ────────────────────────────────────────────
console.log("\n5. PIPELINE STATUS");
const pipelineFiles = [
  ["src/data/tools_source.json",                         "RAW source"],
  ["src/data/build/tool-map.json",                       "Tool map (222MB)"],
  ["src/data/build/tools/chatgpt.json",                  "Split tool files"],
  ["src/data/build/page-payloads/tool-pages-rich.json",  "Rich payloads"],
  ["src/data/build/authority-tool-map.json",             "Authority tools"],
  ["E:/2026_Github/AI_Experts_ENRICH_PIPELINE",          "Enrich pipeline repo"],
];
for (const [fp, label] of pipelineFiles) {
  const exists = fs.existsSync(fp);
  const size = exists ? Math.round(fs.statSync(fp).size / 1024 / 1024) + "MB" : "-";
  console.log(" ", exists ? "✅" : "❌", label.padEnd(30), size);
}

console.log("\n" + "=".repeat(60));
console.log("Plak output naar Claude voor analyse");
console.log("=".repeat(60) + "\n");
