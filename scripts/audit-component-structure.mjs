import fs from "fs";
import path from "path";

const root = process.cwd();
const componentsDir = path.join(root, "src/components");

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".astro")) files.push(full);
  }
  return files;
}

const files = walk(componentsDir);

const byName = new Map();
const sections = [];
const cards = [];
const site = [];
const other = [];

for (const file of files) {
  const rel = path.relative(root, file);
  const base = path.basename(file);

  if (!byName.has(base)) byName.set(base, []);
  byName.get(base).push(rel);

  if (rel.includes("components/cards/")) cards.push(rel);
  else if (rel.includes("components/sections/")) sections.push(rel);
  else if (rel.includes("components/site/")) site.push(rel);
  else other.push(rel);
}

const duplicates = [...byName.entries()]
  .filter(([, arr]) => arr.length > 1)
  .map(([name, paths]) => ({ name, paths }))
  .sort((a, b) => a.name.localeCompare(b.name));

const out = {
  generated_at: new Date().toISOString(),
  totals: {
    astro_components: files.length,
    cards: cards.length,
    sections: sections.length,
    site: site.length,
    other: other.length,
    duplicate_component_names: duplicates.length,
  },
  duplicate_component_names: duplicates,
  cards,
  sections,
  site,
  other,
};

const outPath = path.join(root, "src/data/build/component-structure-audit.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

console.log("\nComponent Structure Audit");
console.log("=========================");
console.log(`Total Astro components:   ${files.length}`);
console.log(`Cards:                    ${cards.length}`);
console.log(`Sections:                 ${sections.length}`);
console.log(`Site:                     ${site.length}`);
console.log(`Other:                    ${other.length}`);
console.log(`Duplicate names:          ${duplicates.length}`);
if (duplicates.length) {
  console.log("\nDuplicates:");
  for (const dup of duplicates) {
    console.log(`- ${dup.name}`);
    for (const p of dup.paths) console.log(`  ${p}`);
  }
}
console.log(`\nSaved: ${outPath}\n`);