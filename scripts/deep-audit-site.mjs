import fs from "fs";
import path from "path";

const root = process.cwd();
const toolsCandidates = [
  "src/data/tools.json",
  "src/data/tools_production.json",
  "src/data/tools_enriched.json",
  "src/data/tools_public.json"
];

function printSection(title) {
  console.log("\n========================================");
  console.log(title);
  console.log("========================================\n");
}

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(path.join(root, p), "utf-8"));
}

function pickToolsFile() {
  for (const file of toolsCandidates) {
    if (exists(file)) return file;
  }
  return null;
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(text) {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function analyzeTools(tools) {
  const duplicatesByName = {};
  const duplicatesBySlug = {};
  const duplicatesByUrl = {};
  const categories = {};
  const tags = {};
  const subcats = {};
  const issues = {
    thinDescriptions: [],
    missingDescriptions: [],
    missingLogos: [],
    missingCategories: [],
    missingPricing: [],
    missingWebsite: [],
    missingTags: [],
    missingSlug: []
  };

  for (const tool of tools) {
    const name = normalize(tool.name);
    const url = normalize(tool.url || tool.website);
    const slug = normalize(tool.slug || slugify(tool.name));
    const category = normalize(tool.category);
    const pricing = normalize(tool.pricing);
    const description = String(tool.description || tool.desc || tool.short || "").trim();
    const logo = normalize(tool.logo || tool.logo_url);
    const toolTags = Array.isArray(tool.tags) ? tool.tags : [];
    const subcategory = normalize(tool.subcategory || tool.sub_category || "");

    if (name) duplicatesByName[name] = (duplicatesByName[name] || 0) + 1;
    if (url) duplicatesByUrl[url] = (duplicatesByUrl[url] || 0) + 1;
    if (slug) duplicatesBySlug[slug] = (duplicatesBySlug[slug] || 0) + 1;

    if (category) categories[category] = (categories[category] || 0) + 1;
    if (subcategory) subcats[subcategory] = (subcats[subcategory] || 0) + 1;

    for (const tag of toolTags) {
      const t = normalize(tag);
      if (!t) continue;
      tags[t] = (tags[t] || 0) + 1;
    }

    if (!description) issues.missingDescriptions.push(tool.name || "(unknown)");
    else if (description.length < 80) issues.thinDescriptions.push(tool.name || "(unknown)");

    if (!logo) issues.missingLogos.push(tool.name || "(unknown)");
    if (!category) issues.missingCategories.push(tool.name || "(unknown)");
    if (!pricing) issues.missingPricing.push(tool.name || "(unknown)");
    if (!url) issues.missingWebsite.push(tool.name || "(unknown)");
    if (!toolTags.length) issues.missingTags.push(tool.name || "(unknown)");
    if (!tool.slug) issues.missingSlug.push(tool.name || "(unknown)");
  }

  const duplicateNames = Object.entries(duplicatesByName).filter(([, c]) => c > 1);
  const duplicateSlugs = Object.entries(duplicatesBySlug).filter(([, c]) => c > 1);
  const duplicateUrls = Object.entries(duplicatesByUrl).filter(([, c]) => c > 1);

  printSection("DEEP AUDIT SUMMARY");
  console.log("Total tools:", tools.length);
  console.log("Duplicate names:", duplicateNames.length);
  console.log("Duplicate slugs:", duplicateSlugs.length);
  console.log("Duplicate URLs:", duplicateUrls.length);
  console.log("Missing descriptions:", issues.missingDescriptions.length);
  console.log("Thin descriptions:", issues.thinDescriptions.length);
  console.log("Missing logos:", issues.missingLogos.length);
  console.log("Missing categories:", issues.missingCategories.length);
  console.log("Missing pricing:", issues.missingPricing.length);
  console.log("Missing website URLs:", issues.missingWebsite.length);
  console.log("Missing tags:", issues.missingTags.length);
  console.log("Missing slug fields:", issues.missingSlug.length);

  printSection("TOP CATEGORIES");
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([k, v]) => console.log(k, "->", v));

  printSection("TOP SUBCATEGORIES");
  Object.entries(subcats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([k, v]) => console.log(k, "->", v));

  printSection("TOP TAGS");
  Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .forEach(([k, v]) => console.log(k, "->", v));

  printSection("LOW-DENSITY CATEGORIES");
  Object.entries(categories)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 20)
    .forEach(([k, v]) => console.log(k, "->", v));

  printSection("POTENTIAL SEO OPPORTUNITIES");
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([k, v]) => {
      console.log(`Best ${k} tools -> category density ${v}`);
      console.log(`${k} alternatives -> category density ${v}`);
      console.log(`${k} comparison pages -> category density ${v}`);
    });

  printSection("INTERNAL LINKING OPPORTUNITIES");
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([k, v]) => {
      console.log(`Category hub: ${k}`);
      console.log(`Link from homepage, best pages, comparison pages, and tool pages into ${k}`);
      console.log(`Create related clusters for ${k} with ${v} tools\n`);
    });

  printSection("SAMPLE DUPLICATE NAMES");
  duplicateNames.slice(0, 30).forEach(([k, v]) => console.log(k, "->", v));

  printSection("SAMPLE DUPLICATE SLUGS");
  duplicateSlugs.slice(0, 30).forEach(([k, v]) => console.log(k, "->", v));

  printSection("SAMPLE DUPLICATE URLS");
  duplicateUrls.slice(0, 30).forEach(([k, v]) => console.log(k, "->", v));

  printSection("SAMPLE THIN DESCRIPTIONS");
  issues.thinDescriptions.slice(0, 50).forEach(v => console.log(v));

  printSection("SAMPLE MISSING CATEGORY");
  issues.missingCategories.slice(0, 50).forEach(v => console.log(v));

  printSection("SAMPLE MISSING TAGS");
  issues.missingTags.slice(0, 50).forEach(v => console.log(v));

  printSection("RECOMMENDED NEXT ACTIONS");
  console.log("1. Enrich thin descriptions to at least 120-200 characters.");
  console.log("2. Normalize duplicate names, URLs and slugs.");
  console.log("3. Improve category/subcategory consistency.");
  console.log("4. Expand tags into cleaner thematic clusters.");
  console.log("5. Generate best pages, comparison pages and category hubs from strongest clusters.");
  console.log("6. Add missing logos, pricing and platform metadata where possible.");
}

const toolsFile = pickToolsFile();

if (!toolsFile) {
  printSection("ERROR");
  console.log("No tools file found. Checked:");
  toolsCandidates.forEach(f => console.log("-", f));
  process.exit(1);
}

printSection("TOOLS FILE DETECTED");
console.log(toolsFile);

const tools = readJson(toolsFile);
if (!Array.isArray(tools)) {
  printSection("ERROR");
  console.log("Detected tools file is not an array.");
  process.exit(1);
}

analyzeTools(tools);
