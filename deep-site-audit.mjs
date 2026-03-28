/**
 * deep-site-audit.mjs
 * ─────────────────────────────────────────────────────────────────
 * Zet in de ROOT van AI_Experts_Repo en run: node deep-site-audit.mjs
 * Genereert deep-site-audit.json — upload dat aan Claude.
 * ─────────────────────────────────────────────────────────────────
 */

import fs   from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const out  = { timestamp: new Date().toISOString(), root: ROOT, sections: {} };

function exists(p)    { return fs.existsSync(path.join(ROOT, p)); }
function read(p)      { try { return fs.readFileSync(path.join(ROOT, p), "utf8"); } catch { return ""; } }
function readJson(p)  { try { return JSON.parse(read(p)); } catch { return null; } }
function sizeKb(p)    { try { return Math.round(fs.statSync(path.join(ROOT, p)).size / 1024); } catch { return 0; } }

function walkPages(dir = "src/pages") {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  const results = [];
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...walkPages(rel));
    else if (e.name.match(/\.(astro|ts|js)$/)) results.push(rel.replace(/\\/g, "/"));
  }
  return results;
}

// ── 1. Git status ─────────────────────────────────────────────────
try {
  const { execSync } = await import("node:child_process");
  out.sections.git = {
    branch: execSync("git branch --show-current", { cwd: ROOT }).toString().trim(),
    status: execSync("git status --short", { cwd: ROOT }).toString().trim().split("\n").slice(0, 20),
  };
} catch { out.sections.git = { branch: "unknown" }; }

// ── 2. All pages with their imports and href patterns ─────────────
const pages = walkPages();
const pageDetails = [];

for (const p of pages) {
  const content = read(p);
  if (!content) continue;

  // Extract all imports
  const imports = [...content.matchAll(/import\s+.*?from\s+["']([^"']+)["']/g)]
    .map(m => m[1]);

  // Extract all href values
  const hrefs = [...content.matchAll(/href[=:]\s*[`"']([^`"']+)[`"']/g)]
    .map(m => m[1])
    .filter(h => h.startsWith("/") || h.startsWith("http"));

  // Check which imports are broken
  const brokenImports = imports
    .filter(i => i.startsWith("@/") || i.startsWith("./") || i.startsWith("../"))
    .filter(i => {
      const resolved = i.startsWith("@/")
        ? path.join(ROOT, "src", i.slice(2))
        : path.join(ROOT, path.dirname(p), i);
      const exts = ["", ".astro", ".ts", ".js", ".mjs", ".json", ".css"];
      return !exts.some(ext => fs.existsSync(resolved + ext));
    });

  // Detect old-style hrefs
  const oldLinks = hrefs.filter(h =>
    h.includes("/vs/") || h.includes("/ai-tools/[") ||
    (h.startsWith("/ai-tools") && !h.includes("category") && !h.includes("tag") &&
     !h.includes("pricing") && !h.includes("industry") && !h.includes("use-case") &&
     !h.includes("feature") && !h.includes("tool-type") && h !== "/ai-tools")
  );

  // Detect dynamic routes
  const isDynamic = p.includes("[");
  const dataImports = imports.filter(i => i.includes("/data/"));

  pageDetails.push({
    path: p,
    lines: content.split("\n").length,
    isDynamic,
    imports: dataImports,
    brokenImports,
    oldLinks: [...new Set(oldLinks)].slice(0, 5),
    allHrefs: [...new Set(hrefs.filter(h => h.startsWith("/")))].slice(0, 15),
    hasLogo: content.includes("logo") || content.includes("clearbit"),
    hasLogoMap: content.includes("logo-map"),
    usesOldVs: content.includes('"/vs') || content.includes("href: \"/vs"),
    usesOldAiTools: content.includes('href="/ai-tools"') || content.includes("href: \"/ai-tools\""),
    preview: content.slice(0, 300),
  });
}

out.sections.pages = pageDetails;

// ── 3. Components inventory ───────────────────────────────────────
function walkComponents(dir = "src/components") {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  const results = [];
  for (const e of fs.readdirSync(full, { withFileTypes: true })) {
    const rel = path.join(dir, e.name).replace(/\\/g, "/");
    if (e.isDirectory()) results.push(...walkComponents(rel));
    else if (e.name.endsWith(".astro")) {
      const content = read(rel);
      results.push({
        path: rel,
        lines: content.split("\n").length,
        hasLogo: content.includes("logo") || content.includes("clearbit"),
        hasLogoMap: content.includes("logo-map"),
        hrefsUsed: [...new Set([...content.matchAll(/href[=:]\s*[`"']([^`"']+)[`"']/g)]
          .map(m => m[1]).filter(h => h.startsWith("/")))].slice(0, 10),
      });
    }
  }
  return results;
}
out.sections.components = walkComponents();

// ── 4. homeConfig analysis ────────────────────────────────────────
const homeConfigContent = read("src/data/homeConfig.ts") || read("src/data/homeConfig.js");
const navLinks = [...homeConfigContent.matchAll(/href:\s*["']([^"']+)["']/g)].map(m => m[1]);
const footerLinks = [...homeConfigContent.matchAll(/href:\s*["']([^"']+)["']/g)].map(m => m[1]);

out.sections.homeConfig = {
  exists: !!homeConfigContent,
  navLinks,
  hasOldVs:       navLinks.some(l => l === "/vs"),
  hasOldAiTools:  navLinks.some(l => l === "/ai-tools"),
  hasNewCompare:  navLinks.some(l => l === "/compare"),
  hasNewTools:    navLinks.some(l => l === "/tools"),
  hasUseCase:     navLinks.some(l => l.includes("/use-case")),
  preview: homeConfigContent.slice(0, 800),
};

// ── 5. Data quality check ─────────────────────────────────────────
out.sections.data = {};

// tool-map.json sample
const toolMap = readJson("src/data/build/tool-map.json");
if (toolMap) {
  const slugs = Object.keys(toolMap);
  const sample = ["chatgpt", "claude", "midjourney", slugs[0], slugs[100]].filter(Boolean);
  out.sections.data.toolMap = {
    count: slugs.length,
    sizeKb: sizeKb("src/data/build/tool-map.json"),
    samples: sample.map(s => {
      const t = toolMap[s] || {};
      return {
        slug: s,
        name: t.name || t.display_name,
        logo_url: t.logo_url || "",
        logo_domain: t.logo_domain || "",
        has_description: !!(t.description || t.short_description || t.long_description),
        has_faq: Array.isArray(t.faq_items) && t.faq_items.length > 0,
        has_pros: Array.isArray(t.pros) && t.pros.length > 0,
        has_use_cases: Array.isArray(t.use_cases) && t.use_cases.length > 0,
        has_compare_candidates: Array.isArray(t.compare_candidates) && t.compare_candidates.length > 0,
        pricing_tier: t.pricing_tier,
        category: t.category,
        subcategory: t.subcategory,
        field_count: Object.keys(t).length,
        all_fields: Object.keys(t),
      };
    }),
  };
}

// logo-map.json
const logoMap = readJson("src/data/build/logo-map.json");
if (logoMap) {
  const logos = Object.values(logoMap);
  out.sections.data.logoMap = {
    count: Object.keys(logoMap).length,
    sizeKb: sizeKb("src/data/build/logo-map.json"),
    filled: logos.filter(v => v && v.length > 5).length,
    sample: Object.entries(logoMap).slice(0, 5),
    chatgpt: logoMap["chatgpt"] || "MISSING",
    claude:  logoMap["claude"]  || "MISSING",
  };
}

// page-payloads check
const payloadDir = "src/data/build/page-payloads";
out.sections.data.payloads = {};
if (exists(payloadDir)) {
  for (const f of fs.readdirSync(path.join(ROOT, payloadDir))) {
    if (!f.endsWith(".json")) continue;
    const d = readJson(`${payloadDir}/${f}`);
    out.sections.data.payloads[f] = {
      count: Array.isArray(d) ? d.length : 0,
      sizeKb: sizeKb(`${payloadDir}/${f}`),
      sampleKeys: d?.[0] ? Object.keys(d[0]).slice(0, 10) : [],
    };
  }
}

// homepage-data
const hp = readJson("src/data/build/homepage-data.json");
out.sections.data.homepageData = hp ? {
  keys: Object.keys(hp),
  total_tools: hp.total_tools,
  total_categories: hp.total_categories,
  featured_tools_count: hp.featured_tools?.length || 0,
  popular_tools_count: hp.popular_tools?.length || 0,
  categories_count: hp.categories?.length || 0,
  sample_tool: hp.featured_tools?.[0] || hp.popular_tools?.[0],
} : null;

// ── 6. Internal link map ──────────────────────────────────────────
// Collect all hrefs used across all pages and check if routes exist
const allHrefs = new Set();
const routeMap = new Set(pages.map(p =>
  p.replace("src/pages", "")
   .replace("/index.astro", "")
   .replace(".astro", "")
   .replace(".ts", "")
   .replace(/\[.*?\]/g, "[slug]") // normalize dynamic
));

for (const pd of pageDetails) {
  for (const h of pd.allHrefs || []) allHrefs.add(h);
}
for (const c of out.sections.components || []) {
  for (const h of c.hrefsUsed || []) allHrefs.add(h);
}

// Check which links have no matching route
const brokenLinks = [];
const routeList = [...routeMap];
for (const href of allHrefs) {
  if (href.startsWith("http") || href.includes("{") || href.includes("$")) continue;
  const base = href.split("?")[0].split("#")[0];
  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  const hasRoute = routeList.some(r => {
    if (r === normalized) return true;
    // Check if it matches a dynamic route
    const pattern = r.replace(/\[slug\]/g, "[^/]+");
    return new RegExp(`^${pattern}$`).test(normalized);
  });
  if (!hasRoute && !href.includes("localhost")) {
    brokenLinks.push(href);
  }
}
out.sections.internalLinks = {
  total_unique: allHrefs.size,
  routes_available: routeList,
  potentially_broken: [...new Set(brokenLinks)].slice(0, 30),
};

// ── 7. Summary & recommendations ─────────────────────────────────
const issues = [];
const warnings = [];

// Check old links
const pagesWithOldVs = pageDetails.filter(p => p.usesOldVs).map(p => p.path);
const pagesWithOldAiTools = pageDetails.filter(p => p.usesOldAiTools).map(p => p.path);
if (pagesWithOldVs.length) issues.push(`OLD /vs/ links in: ${pagesWithOldVs.join(", ")}`);
if (pagesWithOldAiTools.length) warnings.push(`OLD /ai-tools links in: ${pagesWithOldAiTools.join(", ")}`);

// Check logo-map usage
const withoutLogoMap = pageDetails.filter(p => p.hasLogo && !p.hasLogoMap && p.isDynamic).map(p => p.path);
if (withoutLogoMap.length) warnings.push(`Dynamic pages with logo but no logo-map: ${withoutLogoMap.join(", ")}`);

// Check homeConfig
if (out.sections.homeConfig.hasOldVs) issues.push("homeConfig.ts still has /vs link");
if (!out.sections.homeConfig.hasNewCompare) warnings.push("homeConfig.ts missing /compare link");

// Check data
if (out.sections.data.logoMap?.chatgpt === "MISSING") issues.push("logo-map.json missing chatgpt");
if (!out.sections.data.toolMap?.samples?.some(s => s.has_faq)) warnings.push("tool-map.json samples have no FAQ data — deep content may not be loaded");
if (!out.sections.data.toolMap?.samples?.some(s => s.has_pros)) warnings.push("tool-map.json samples have no pros/cons — deep content may not be loaded");

out.sections.summary = {
  issues,
  warnings,
  page_count: pages.length,
  broken_imports_total: pageDetails.reduce((s, p) => s + p.brokenImports.length, 0),
  old_vs_links: pagesWithOldVs,
  pages_with_logo_map: pageDetails.filter(p => p.hasLogoMap).map(p => p.path),
  pages_without_logo_map: withoutLogoMap,
};

// ── Write output ──────────────────────────────────────────────────
const outPath = path.join(ROOT, "deep-site-audit.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

// Console summary
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  Deep Site Audit Complete                           ║");
console.log("╚══════════════════════════════════════════════════════╝\n");
console.log(`Branch:       ${out.sections.git.branch}`);
console.log(`Pages found:  ${pages.length}`);
console.log(`Components:   ${out.sections.components.length}`);
console.log(`Tool-map:     ${out.sections.data.toolMap?.count || 0} tools`);
console.log(`Logo-map:     ${out.sections.data.logoMap?.count || 0} entries (${out.sections.data.logoMap?.filled || 0} filled)`);
console.log(`\nISSUES (${issues.length}):`);
issues.forEach(i => console.log(`  ❌ ${i}`));
console.log(`\nWARNINGS (${warnings.length}):`);
warnings.forEach(w => console.log(`  ⚠️  ${w}`));
console.log(`\nPotentially broken internal links: ${out.sections.internalLinks.potentially_broken.length}`);
console.log(`\n✅ Saved: deep-site-audit.json — upload dit aan Claude.\n`);
