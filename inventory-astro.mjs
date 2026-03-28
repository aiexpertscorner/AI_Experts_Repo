#!/usr/bin/env node
/**
 * inventory-astro.mjs
 * Drop in: AI_Experts_Repo/ (clean-build-v3 branch)
 * Run:     node inventory-astro.mjs
 *
 * Geeft je exacte page counts, route status en SEO check.
 */
import fs   from "node:fs";
import path from "node:path";

const ROOT    = process.cwd();
const BUILD   = path.join(ROOT, "src/data/build");
const PAYLOAD = path.join(BUILD, "page-payloads");
const TOOLS   = path.join(BUILD, "tools");
const PAGES   = path.join(ROOT, "src/pages");
const STYLES  = path.join(ROOT, "src/styles");

const G = "\x1b[32m", Y = "\x1b[33m", R = "\x1b[31m", B = "\x1b[36m";
const X = "\x1b[0m",  D = "\x1b[2m",  W = "\x1b[1m",  M = "\x1b[35m";

function hdr(t) {
  console.log(`\n${W}${B}── ${t} ${"─".repeat(Math.max(0, 56 - t.length))}${X}`);
}
function stat(p) {
  if (!fs.existsSync(p)) return null;
  try {
    const raw  = fs.readFileSync(p, "utf8");
    const data = JSON.parse(raw);
    const n    = Array.isArray(data) ? data.length : Object.keys(data).length;
    const kb   = Math.round(raw.length / 1024);
    return { n, kb, mb: (raw.length/1024/1024).toFixed(1), data };
  } catch { return null; }
}
function pageExists(rel) { return fs.existsSync(path.join(PAGES, rel)); }
function styleExists(f)  { return fs.existsSync(path.join(STYLES, f)); }

// ─────────────────────────────────────────────────────────────────

console.log(`\n${W}AIExpertsCorner — Astro Repo Inventory${X}`);
console.log(`${D}Branch: clean-build-v3  |  Root: ${ROOT}${X}`);
console.log(`${D}Time:   ${new Date().toLocaleString()}${X}`);

// ── 1. Routes + page counts ────────────────────────────────────────────────────
hdr("1. Routes & page counts");
console.log(`  ${D}For each route: page file exists? + how many pages will be built?${X}\n`);

const ROUTES = [
  // file, data file(s), label, route pattern
  { file:"index.astro",                         data:null,                                       label:"Homepage",                  route:"/",                        pages:1 },
  { file:"tools/index.astro",                   data:"category-map.json",                        label:"Tools hub",                 route:"/tools",                   pages:1 },
  { file:"tools/[slug].astro",                  data:["tool-slugs.json","tools/"],               label:"Tool detail",               route:"/tools/[slug]" },
  { file:"tools/category/[slug].astro",         data:"category-paths.json",                      label:"Category pages",            route:"/tools/category/[slug]" },
  { file:"tools/pricing/[slug].astro",          data:"pricing-paths.json",                       label:"Pricing pages",             route:"/tools/pricing/[slug]" },
  { file:"tools/feature/[slug].astro",          data:"feature-paths.json",                       label:"Feature pages",             route:"/tools/feature/[slug]" },
  { file:"tools/industry/[slug].astro",         data:"industry-paths.json",                      label:"Industry pages",            route:"/tools/industry/[slug]" },
  { file:"tools/tag/[slug].astro",              data:"tag-paths.json",                           label:"Tag pages",                 route:"/tools/tag/[slug]" },
  { file:"tools/tool-type/[slug].astro",        data:"tool-type-paths.json",                     label:"Tool-type pages",           route:"/tools/tool-type/[slug]" },
  { file:"compare/index.astro",                 data:null,                                       label:"Compare hub",               route:"/compare",                 pages:1 },
  { file:"compare/[slug].astro",                data:"page-payloads/compare-pages-rich.json",    label:"Compare detail",            route:"/compare/[slug]" },
  { file:"alternatives/index.astro",            data:null,                                       label:"Alternatives hub",          route:"/alternatives",            pages:1 },
  { file:"alternatives/[slug].astro",           data:"page-payloads/alternatives-pages.json",    label:"Alternatives detail",       route:"/alternatives/[slug]" },
  { file:"best/index.astro",                    data:null,                                       label:"Best-of hub",               route:"/best",                    pages:1 },
  { file:"best/[slug].astro",                   data:["page-payloads/best-pages.json","page-payloads/best-cluster-pages.json"], label:"Best-of detail", route:"/best/[slug]" },
  { file:"use-case/index.astro",                data:null,                                       label:"Use-case hub",              route:"/use-case",                pages:1 },
  { file:"use-case/[slug].astro",               data:"page-payloads/use-case-cluster-pages.json",label:"Use-case detail",          route:"/use-case/[slug]" },
  { file:"industry/index.astro",                data:null,                                       label:"Industry hub",              route:"/industry",                pages:1 },
  { file:"industry/[slug].astro",               data:"industry-paths.json",                      label:"Industry detail (hub)",     route:"/industry/[slug]" },
  { file:"company/[slug].astro",                data:"company-paths.json",                       label:"Company pages",             route:"/company/[slug]" },
  { file:"about.astro",                         data:null,                                       label:"About",                     route:"/about",                   pages:1 },
  { file:"privacy.astro",                       data:null,                                       label:"Privacy",                   route:"/privacy",                 pages:1 },
  { file:"terms.astro",                         data:null,                                       label:"Terms",                     route:"/terms",                   pages:1 },
  { file:"contact.astro",                       data:null,                                       label:"Contact",                   route:"/contact",                 pages:1 },
  { file:"submit-tool.astro",                   data:null,                                       label:"Submit Tool",               route:"/submit-tool",             pages:1 },
];

let totalPages = 0;
let missingRoutes = 0;
let missingData   = 0;

for (const r of ROUTES) {
  const fileOk = pageExists(r.file);

  // Count pages from data
  let count = r.pages || 0;
  let dataOk = true;

  if (!r.pages && r.data) {
    const dataFiles = Array.isArray(r.data) ? r.data : [r.data];
    for (const df of dataFiles) {
      if (df === "tools/") {
        // Count individual files in tools/ dir
        const n = fs.existsSync(TOOLS) ? fs.readdirSync(TOOLS).filter(f=>f.endsWith(".json")).length : 0;
        count += n;
        if (n === 0) dataOk = false;
      } else {
        const s = stat(path.join(BUILD, df));
        count += s?.n || 0;
        if (!s || s.n === 0) dataOk = false;
      }
    }
  }

  const fileIcon  = fileOk  ? G+"✓"+X : R+"✗"+X;
  const dataIcon  = !r.data ? D+"—"+X : dataOk ? G+"✓"+X : R+"✗"+X;
  const countStr  = count > 0 ? W + count.toLocaleString().padStart(7) + X : R + "0".padStart(7) + X;
  const routeStr  = r.route.padEnd(38);
  const labelStr  = String(r.label).padEnd(26);

  console.log(`  ${fileIcon} ${dataIcon} ${labelStr} ${routeStr} ${countStr} pages`);

  if (!fileOk) missingRoutes++;
  if (r.data && !dataOk && count === 0) missingData++;
  totalPages += count;
}

console.log(`\n  ${"─".repeat(68)}`);
console.log(`  ${W}  ESTIMATED TOTAL PAGES:${X}                                  ${W}${totalPages.toLocaleString()}${X}`);
console.log(`  ${D}  (Astro build = sum of all getStaticPaths entries + static pages)${X}`);
if (missingRoutes) console.log(`\n  ${R}  ${missingRoutes} page files missing${X} ${D}— these routes won't build${X}`);
if (missingData)   console.log(`  ${Y}  ${missingData} data sources empty${X}  ${D}— pages will build but with 0 entries${X}`);

// ── 2. Data files present in build/ ───────────────────────────────────────────
hdr("2. Data files in src/data/build/");
console.log(`  ${D}What's actually on disk in this repo:${X}\n`);

if (!fs.existsSync(BUILD)) {
  console.log(`  ${R}✗ src/data/build/ does not exist!${X}`);
  console.log(`    ${Y}→ You need to copy/sync build output from the pipeline${X}`);
} else {
  const files = fs.readdirSync(BUILD).filter(f => f.endsWith(".json")).sort();
  for (const f of files) {
    const s = stat(path.join(BUILD, f));
    const color = s?.n > 0 ? G : R;
    console.log(`  ${color}✓${X} ${f.padEnd(42)} ${String(s?.n||0).padStart(8)} entries  ${s?.kb > 999 ? s.mb+"MB" : s?.kb+"KB"}`);
  }

  // page-payloads/
  if (fs.existsSync(PAYLOAD)) {
    console.log(`\n  ${W}page-payloads/${X}`);
    const pfiles = fs.readdirSync(PAYLOAD).filter(f=>f.endsWith(".json")).sort();
    for (const f of pfiles) {
      const s = stat(path.join(PAYLOAD, f));
      const color = s?.n > 0 ? G : R;
      console.log(`  ${color}✓${X} page-payloads/${f.padEnd(34)} ${String(s?.n||0).padStart(8)} entries  ${s?.kb > 999 ? s.mb+"MB" : s?.kb+"KB"}`);
    }
  } else {
    console.log(`\n  ${R}✗ page-payloads/ directory missing${X}`);
  }

  // tools/
  if (fs.existsSync(TOOLS)) {
    const tcount = fs.readdirSync(TOOLS).filter(f=>f.endsWith(".json")).length;
    const color  = tcount > 1000 ? G : tcount > 0 ? Y : R;
    console.log(`\n  ${color}✓${X} tools/ directory: ${W}${tcount.toLocaleString()} individual files${X}`);
  } else {
    console.log(`\n  ${R}✗ tools/ directory missing${X}`);
  }
}

// ── 3. CSS / styles ────────────────────────────────────────────────────────────
hdr("3. CSS files in src/styles/");

const cssFiles = [
  ["tokens.css",         "REQUIRED — all other CSS depends on this"],
  ["base.css",           "REQUIRED — reset + body"],
  ["layout.css",         "REQUIRED — containers, grids"],
  ["components.css",     "REQUIRED — badges, buttons, cards"],
  ["home.css",           "homepage styles"],
  ["pages.css",          "compare/alternatives/best/use-case page styles"],
  ["taxonomy.css",       "best/[slug] page styles"],
  ["tool-detail.css",    "tools/[slug] page styles"],
  ["hub-listings.css",   "hub index pages (compare/best/alternatives/use-case index)"],
  ["dimension-page.css", "category/pricing/feature/tag listing pages"],
  ["tools-index.css",    "tools/index page"],
  ["trust-pages.css",    "about/privacy/terms/contact"],
];

for (const [f, note] of cssFiles) {
  const ok = styleExists(f);
  console.log(`  ${ok ? G+"✓"+X : R+"✗"+X} ${f.padEnd(26)} ${D}${note}${X}`);
}

// ── 4. Page quality sample ─────────────────────────────────────────────────────
hdr("4. Content quality sample");
console.log(`  ${D}Spot-check: does the data have real SEO content?${X}\n`);

// Check a tool detail sample
const toolSlugs = stat(path.join(BUILD, "tool-slugs.json")) || stat(path.join(BUILD, "tool-paths.json"));
if (toolSlugs?.data?.length > 0 && fs.existsSync(TOOLS)) {
  const slug   = toolSlugs.data[0];
  const sample = stat(path.join(TOOLS, `${slug}.json`));
  if (sample?.data) {
    const t = sample.data;
    console.log(`  Tool sample: ${W}${t.name || slug}${X}`);
    const checks = [
      ["tagline",              (t.tagline||"").length > 20],
      ["description",          (t.description||t.long_description||"").length > 100],
      ["pricing_tier",         !!t.pricing_tier && t.pricing_tier !== "unknown"],
      ["logo_url / logo_domain",(t.logo_url||t.logo_domain||"").length > 0],
      ["category",             !!(t.category || t.category_slug)],
      ["use_cases[]",          Array.isArray(t.use_cases) && t.use_cases.length > 0],
      ["pros[]",               Array.isArray(t.pros) && t.pros.length > 0],
      ["faq_items[]",          Array.isArray(t.faq_items) && t.faq_items.length > 0],
      ["related / compare_with",Array.isArray(t.related||t.related_tools) && (t.related||t.related_tools||[]).length > 0],
      ["seo_title",            (t.seo_title||"").length > 10],
    ];
    for (const [field, ok] of checks) {
      console.log(`    ${ok ? G+"✓"+X : Y+"⚠"+X} ${field}`);
    }
  }
}

// Check a compare sample
const cmpRich = stat(path.join(PAYLOAD, "compare-pages-rich.json"));
if (cmpRich?.data?.length > 0) {
  const sample = cmpRich.data[0];
  console.log(`\n  Compare sample: ${W}${sample?.tool_a?.name} vs ${sample?.tool_b?.name}${X}`);
  const checks = [
    ["tool_a.slug",                (sample?.tool_a?.slug||"").length > 0],
    ["tool_b.slug",                (sample?.tool_b?.slug||"").length > 0],
    ["comparison.verdict",         (sample?.comparison?.verdict||"").length > 30],
    ["comparison.faqs (2+)",       Array.isArray(sample?.comparison?.faqs) && sample.comparison.faqs.length >= 2],
    ["seo.schema_faq",             !!sample?.seo?.schema_faq],
    ["tool_a.pros[]",              Array.isArray(sample?.tool_a?.pros) && sample.tool_a.pros.length > 0],
  ];
  for (const [field, ok] of checks) {
    console.log(`    ${ok ? G+"✓"+X : Y+"⚠"+X} ${field}`);
  }
}

// ── 5. SEO completeness score ──────────────────────────────────────────────────
hdr("5. SEO completeness score");

const scores = {
  "Tool detail pages built":       fs.existsSync(TOOLS) && fs.readdirSync(TOOLS).filter(f=>f.endsWith(".json")).length > 1000,
  "Compare pages with FAQs":       cmpRich?.data?.some(p=>p?.comparison?.faqs?.length > 0),
  "Best-of pages present":         (stat(path.join(PAYLOAD,"best-pages.json"))?.n||0) > 0,
  "Best clusters present":         (stat(path.join(PAYLOAD,"best-cluster-pages.json"))?.n||0) > 0,
  "Use-case pages with FAQs":      stat(path.join(PAYLOAD,"use-case-cluster-pages.json"))?.data?.some(p=>p?.cross_tool_faqs?.length > 0),
  "Alternatives pages present":    (stat(path.join(PAYLOAD,"alternatives-pages.json"))?.n||0) > 0,
  "logo-map.json present":         !!(stat(path.join(BUILD,"logo-map.json"))?.n > 0),
  "Category pages present":        (stat(path.join(BUILD,"category-paths.json"))?.n||0) > 0,
  "Industry pages present":        (stat(path.join(BUILD,"industry-paths.json"))?.n||0) > 0,
  "Feature pages present":         (stat(path.join(BUILD,"feature-paths.json"))?.n||0) > 0,
  "Tag pages present":             (stat(path.join(BUILD,"tag-paths.json"))?.n||0) > 0,
  "tokens.css present":            styleExists("tokens.css"),
  "hub-listings.css present":      styleExists("hub-listings.css"),
  "tool-detail.css present":       styleExists("tool-detail.css"),
};

let passed = 0;
for (const [label, ok] of Object.entries(scores)) {
  console.log(`  ${ok ? G+"✓"+X : R+"✗"+X} ${label}`);
  if (ok) passed++;
}
const pct   = Math.round(passed / Object.keys(scores).length * 100);
const color = pct >= 80 ? G : pct >= 50 ? Y : R;
console.log(`\n  ${color}${W}Score: ${passed}/${Object.keys(scores).length} (${pct}%)${X}`);

if (pct < 80) {
  console.log(`\n  ${Y}To improve:${X}`);
  if (!fs.existsSync(TOOLS)) console.log(`    → Copy src/data/build/tools/ from pipeline to repo`);
  if (!(stat(path.join(PAYLOAD,"compare-pages-rich.json"))?.n > 0)) console.log(`    → Run build-seo-datasets-v5.mjs in pipeline`);
  if (!(stat(path.join(BUILD,"logo-map.json"))?.n > 0)) console.log(`    → Copy logo-map.json from pipeline to src/data/build/`);
}

console.log(`\n${D}Run: node inventory-astro.mjs  to refresh this report.${X}\n`);
