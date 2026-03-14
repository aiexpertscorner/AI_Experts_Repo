import fs from "fs";
import path from "path";

const root = process.cwd();
const pagesDir = path.join(root, "src/pages");

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".astro")) files.push(full);
  }
  return files;
}

const pageFiles = walk(pagesDir);

const audit = [];

for (const file of pageFiles) {
  const rel = path.relative(root, file);
  const raw = fs.readFileSync(file, "utf8");

  const imports = [...raw.matchAll(/import\s+.*?from\s+["'](.+?)["']/g)].map((m) => m[1]);
  const buildRefs = [...raw.matchAll(/src\/data\/build\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]);
  const toolsProductionRefs = (raw.match(/tools_production\.json/g) || []).length;
  const inlineStyles = (raw.match(/\bstyle=/g) || []).length;
  const headings = (raw.match(/<h1[\s>]/g) || []).length;
  const faqRefs = /faq/i.test(raw);
  const breadcrumbRefs = /breadcrumb/i.test(raw);
  const relatedRefs = /related/i.test(raw);
  const categoryRefs = /category/i.test(raw);
  const subcategoryRefs = /subcategory/i.test(raw);
  const workflowRefs = /workflow/i.test(raw);

  audit.push({
    file: rel,
    imports_count: imports.length,
    build_refs: buildRefs,
    tools_production_refs: toolsProductionRefs,
    inline_styles: inlineStyles,
    h1_count: headings,
    faq_refs: faqRefs,
    breadcrumb_refs: breadcrumbRefs,
    related_refs: relatedRefs,
    category_refs: categoryRefs,
    subcategory_refs: subcategoryRefs,
    workflow_refs: workflowRefs,
  });
}

const out = {
  generated_at: new Date().toISOString(),
  totals: {
    pages: audit.length,
    with_inline_styles: audit.filter((x) => x.inline_styles > 0).length,
    with_tools_production_refs: audit.filter((x) => x.tools_production_refs > 0).length,
    with_no_h1: audit.filter((x) => x.h1_count === 0).length,
  },
  pages: audit,
};

const outPath = path.join(root, "src/data/build/page-dependency-audit.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

console.log("\nPage Dependency Audit");
console.log("=====================");
console.log(`Pages:                    ${out.totals.pages}`);
console.log(`Pages with inline style:  ${out.totals.with_inline_styles}`);
console.log(`Pages with legacy refs:   ${out.totals.with_tools_production_refs}`);
console.log(`Pages without h1:         ${out.totals.with_no_h1}`);
console.log(`\nSaved: ${outPath}\n`);