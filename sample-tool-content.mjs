#!/usr/bin/env node
/**
 * sample-tool-content.mjs
 * Run from: AI_Experts_Repo root
 * node sample-tool-content.mjs
 *
 * Samples 10 tool files from build/tools/ AND checks tool-map.json structure
 * to show exactly what content fields are filled.
 */
import fs   from "node:fs";
import path from "node:path";

const ROOT      = process.cwd();
const TOOLS_DIR = path.join(ROOT, "src/data/build/tools");
const TOOL_MAP  = path.join(ROOT, "src/data/build/tool-map.json");

const G = "\x1b[32m", Y = "\x1b[33m", R = "\x1b[31m", X = "\x1b[0m", W = "\x1b[1m", D = "\x1b[2m";

// ── 1. Sample individual tool files ───────────────────────────────────────────

console.log(`\n${W}1. Individual files: src/data/build/tools/${X}`);

if (!fs.existsSync(TOOLS_DIR)) {
  console.log(`${R}✗ tools/ directory does not exist${X}`);
} else {
  const files = fs.readdirSync(TOOLS_DIR).filter(f => f.endsWith(".json"));
  console.log(`${G}✓${X} ${files.length.toLocaleString()} files present\n`);

  // Sample: first 3, middle 2, last 3 + chatgpt/claude if present
  const special = ["chatgpt.json","claude.json","midjourney.json","github-copilot.json"];
  const picks   = [
    ...special.filter(f => files.includes(f)),
    files[0], files[Math.floor(files.length/4)],
    files[Math.floor(files.length/2)], files[Math.floor(files.length*3/4)],
    files[files.length-1]
  ].filter((v,i,a) => a.indexOf(v) === i).slice(0,8);

  for (const fname of picks) {
    const fpath = path.join(TOOLS_DIR, fname);
    let data;
    try { data = JSON.parse(fs.readFileSync(fpath, "utf8")); } catch { continue; }

    const slug = fname.replace(".json","");
    console.log(`${W}  ${slug}${X}`);
    console.log(`  Top-level keys: ${Object.keys(data).join(", ")}`);

    // Check nested fields
    const checks = [
      // [label, value_to_check]
      ["hero.name",                      data?.hero?.name],
      ["hero.tagline",                   data?.hero?.tagline],
      ["hero.logo_url",                  data?.hero?.logo_url || data?.logo_url],
      ["commercial.pricing_tier",        data?.commercial?.pricing_tier || data?.pricing_tier],
      ["taxonomy.category",              data?.taxonomy?.category || data?.category],
      ["taxonomy.use_cases[]",           data?.taxonomy?.use_cases || data?.use_cases],
      ["content.description",            data?.content?.description || data?.content?.long_description || data?.description],
      ["content.pros[]",                 data?.content?.pros || data?.pros],
      ["content.cons[]",                 data?.content?.cons || data?.cons],
      ["content.unique_features[]",      data?.content?.unique_features],
      ["content.core_features[]",        data?.content?.core_features || data?.content?.feature_tags],
      ["discovery.faq_items[]",          data?.discovery?.faq_items || data?.faq_items],
      ["discovery.workflow_snippets[]",  data?.discovery?.workflow_snippets || data?.workflow_snippets],
      ["audience.best_for_profiles[]",   data?.audience?.best_for_profiles || data?.best_for_profiles],
      ["related.alternatives[]",         data?.related?.alternatives || data?.alternatives],
      ["related.compare_candidates[]",   data?.related?.compare_candidates || data?.compare_candidates],
      ["seo.title",                      data?.seo?.title || data?.seo_title],
      ["seo.description",                data?.seo?.description || data?.seo_description],
    ];

    for (const [label, val] of checks) {
      let display, icon;
      if (val === undefined || val === null || val === "") {
        icon = R + "✗" + X; display = D + "empty" + X;
      } else if (Array.isArray(val)) {
        if (val.length === 0) { icon = Y + "⚠" + X; display = D + "[] (empty array)" + X; }
        else { icon = G + "✓" + X; display = `${val.length} items: ${D}${JSON.stringify(val.slice(0,2)).slice(0,60)}...${X}`; }
      } else if (typeof val === "string") {
        if (val.length < 3) { icon = Y + "⚠" + X; display = D + `"${val}"` + X; }
        else { icon = G + "✓" + X; display = D + `"${val.slice(0,60)}"` + X; }
      } else {
        icon = G + "✓" + X; display = D + JSON.stringify(val).slice(0,60) + X;
      }
      console.log(`    ${icon} ${label.padEnd(34)} ${display}`);
    }
    console.log();
  }
}

// ── 2. Check tool-map.json structure ──────────────────────────────────────────

console.log(`${W}2. tool-map.json structure check${X}`);

if (!fs.existsSync(TOOL_MAP)) {
  console.log(`${R}✗ tool-map.json not found${X}`);
} else {
  const raw  = fs.readFileSync(TOOL_MAP, "utf8");
  const data = JSON.parse(raw);
  const isArray = Array.isArray(data);
  const isObj   = !isArray && typeof data === "object";

  console.log(`  Type:   ${isArray ? "Array" : isObj ? "Object (slug→data)" : "unknown"}`);
  console.log(`  Count:  ${(isArray ? data.length : Object.keys(data).length).toLocaleString()}`);
  console.log(`  SizeMB: ${(raw.length/1024/1024).toFixed(1)}MB`);

  const sample = isArray ? data[0] : Object.values(data)[0];
  if (sample) {
    console.log(`  First entry top-level keys: ${Object.keys(sample).join(", ")}`);
    // If it's an object map, try chatgpt
    if (isObj && data["chatgpt"]) {
      const cg = data["chatgpt"];
      console.log(`\n  chatgpt entry keys: ${Object.keys(cg).join(", ")}`);
      console.log(`  chatgpt.hero?.name: ${cg?.hero?.name || cg?.name || "—"}`);
      console.log(`  chatgpt.content?.description length: ${(cg?.content?.description||"").length}`);
    }
  }
}

// ── 3. Check tools_source.json ────────────────────────────────────────────────

console.log(`\n${W}3. src/data/tools_source.json${X}`);
const srcPath = path.join(ROOT, "src/data/tools_source.json");
if (!fs.existsSync(srcPath)) {
  console.log(`  ${R}✗ not found${X}`);
} else {
  const raw  = fs.readFileSync(srcPath, "utf8");
  const data = JSON.parse(raw);
  const isArr = Array.isArray(data);
  const count = isArr ? data.length : Object.keys(data).length;
  console.log(`  Type:   ${isArr ? "Array" : "Object"}`);
  console.log(`  Count:  ${count.toLocaleString()}`);
  console.log(`  SizeMB: ${(raw.length/1024/1024).toFixed(1)}MB`);
  const sample = isArr ? data[0] : Object.values(data)[0];
  if (sample) console.log(`  Keys:   ${Object.keys(sample).slice(0,12).join(", ")}`);
}

console.log();
