import fs from "fs";
import path from "path";

const root = process.cwd();
const toolsCandidates = [
  "src/data/tools.json",
  "src/data/tools_production.json",
  "src/data/tools_enriched.json",
  "src/data/tools_public.json"
];

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(path.join(root, p), "utf-8"));
}

function walk(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      walk(filepath, filelist);
    } else {
      filelist.push(filepath);
    }
  }
  return filelist;
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

function pickToolsFile() {
  for (const file of toolsCandidates) {
    if (exists(file)) return file;
  }
  return null;
}

function topEntries(obj, limit = 20, ascending = false) {
  return Object.entries(obj)
    .sort((a, b) => ascending ? a[1] - b[1] : b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function analyzeProject() {
  const report = {
    generated_at: new Date().toISOString(),
    project_root: root,
    tools_file_detected: null,
    summary: {},
    issues: {},
    top_categories: [],
    top_subcategories: [],
    top_tags: [],
    low_density_categories: [],
    seo_opportunities: [],
    internal_linking_opportunities: [],
    routes: [],
    components: [],
    datasets: [],
    generated_build_pages: []
  };

  // Route analysis
  const pagesDir = path.join(root, "src/pages");
  const pageFiles = walk(pagesDir);
  report.routes = pageFiles
    .filter(f => f.endsWith(".astro") || f.endsWith(".md"))
    .map(f => f.replace(pagesDir, "").replace(/\\/g, "/").replace(".astro", "").replace(".md", "") || "/");

  // Component analysis
  const compDir = path.join(root, "src/components");
  const compFiles = walk(compDir);
  report.components = compFiles
    .filter(f => f.endsWith(".astro"))
    .map(f => f.replace(root, "").replace(/\\/g, "/"));

  // Data analysis
  const dataDir = path.join(root, "src/data");
  const dataFiles = walk(dataDir);
  report.datasets = dataFiles
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try {
        const json = JSON.parse(fs.readFileSync(f, "utf-8"));
        return {
          file: f.replace(root, "").replace(/\\/g, "/"),
          entries: Array.isArray(json) ? json.length : Object.keys(json || {}).length
        };
      } catch {
        return {
          file: f.replace(root, "").replace(/\\/g, "/"),
          entries: null,
          invalid_json: true
        };
      }
    });

  // Build output
  const distDir = path.join(root, "dist");
  report.generated_build_pages = walk(distDir)
    .filter(f => f.endsWith(".html"))
    .map(f => f.replace(distDir, "").replace(/\\/g, "/"));

  // Tools analysis
  const toolsFile = pickToolsFile();
  if (!toolsFile) {
    report.summary.error = "No tools file found";
    return report;
  }

  report.tools_file_detected = toolsFile;
  const tools = readJson(toolsFile);
  if (!Array.isArray(tools)) {
    report.summary.error = "Detected tools file is not an array";
    return report;
  }

  const categories = {};
  const subcategories = {};
  const tags = {};
  const dupNames = {};
  const dupSlugs = {};
  const dupUrls = {};

  const issues = {
    missing_descriptions: [],
    thin_descriptions: [],
    missing_logos: [],
    missing_categories: [],
    missing_pricing: [],
    missing_website: [],
    missing_tags: [],
    missing_slug: []
  };

  for (const tool of tools) {
    const name = normalize(tool.name);
    const slug = normalize(tool.slug || slugify(tool.name));
    const url = normalize(tool.url || tool.website);
    const category = normalize(tool.category);
    const subcategory = normalize(tool.subcategory || tool.sub_category || "");
    const pricing = normalize(tool.pricing);
    const description = String(tool.description || tool.desc || tool.short || "").trim();
    const logo = normalize(tool.logo || tool.logo_url);
    const toolTags = Array.isArray(tool.tags) ? tool.tags : [];

    if (name) dupNames[name] = (dupNames[name] || 0) + 1;
    if (slug) dupSlugs[slug] = (dupSlugs[slug] || 0) + 1;
    if (url) dupUrls[url] = (dupUrls[url] || 0) + 1;
    if (category) categories[category] = (categories[category] || 0) + 1;
    if (subcategory) subcategories[subcategory] = (subcategories[subcategory] || 0) + 1;

    for (const tag of toolTags) {
      const t = normalize(tag);
      if (t) tags[t] = (tags[t] || 0) + 1;
    }

    if (!description) issues.missing_descriptions.push(tool.name || "(unknown)");
    else if (description.length < 80) issues.thin_descriptions.push(tool.name || "(unknown)");

    if (!logo) issues.missing_logos.push(tool.name || "(unknown)");
    if (!category) issues.missing_categories.push(tool.name || "(unknown)");
    if (!pricing) issues.missing_pricing.push(tool.name || "(unknown)");
    if (!url) issues.missing_website.push(tool.name || "(unknown)");
    if (!toolTags.length) issues.missing_tags.push(tool.name || "(unknown)");
    if (!tool.slug) issues.missing_slug.push(tool.name || "(unknown)");
  }

  const duplicate_names = Object.entries(dupNames).filter(([, c]) => c > 1).map(([key, count]) => ({ key, count }));
  const duplicate_slugs = Object.entries(dupSlugs).filter(([, c]) => c > 1).map(([key, count]) => ({ key, count }));
  const duplicate_urls = Object.entries(dupUrls).filter(([, c]) => c > 1).map(([key, count]) => ({ key, count }));

  report.summary = {
    total_tools: tools.length,
    total_routes: report.routes.length,
    total_components: report.components.length,
    total_datasets: report.datasets.length,
    total_generated_build_pages: report.generated_build_pages.length,
    duplicate_name_count: duplicate_names.length,
    duplicate_slug_count: duplicate_slugs.length,
    duplicate_url_count: duplicate_urls.length
  };

  report.issues = {
    ...issues,
    duplicate_names: duplicate_names.slice(0, 200),
    duplicate_slugs: duplicate_slugs.slice(0, 200),
    duplicate_urls: duplicate_urls.slice(0, 200)
  };

  report.top_categories = topEntries(categories, 30);
  report.top_subcategories = topEntries(subcategories, 30);
  report.top_tags = topEntries(tags, 40);
  report.low_density_categories = topEntries(categories, 20, true);

  report.seo_opportunities = topEntries(categories, 20).map(({ key, count }) => ({
    category: key,
    density: count,
    suggested_pages: [
      `best-${key}-tools`,
      `${key}-alternatives`,
      `${key}-comparison-pages`,
      `${key}-for-beginners`,
      `${key}-enterprise-tools`
    ]
  }));

  report.internal_linking_opportunities = topEntries(categories, 15).map(({ key, count }) => ({
    category: key,
    tool_count: count,
    suggested_links_from: ["homepage", "category hubs", "best pages", "comparison pages", "tool pages"],
    suggested_clusters: [
      `${key} tools`,
      `${key} comparisons`,
      `${key} alternatives`,
      `${key} guides`
    ]
  }));

  return report;
}

const report = analyzeProject();
const outDir = path.join(root, "audit");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "project-audit-report.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

console.log("JSON audit written to:");
console.log(outPath);
