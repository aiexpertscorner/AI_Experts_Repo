import fs from "fs";
import path from "path";

const root = process.cwd();

const TARGET_DIRS = [
  "src/components",
  "src/layouts",
  "src/pages",
  "src/styles",
];

const EXTENSIONS = new Set([".astro", ".css", ".js", ".mjs", ".ts"]);

const results = {
  files: [],
  totals: {
    files: 0,
    astro: 0,
    css: 0,
    inlineStyleHits: 0,
    classListHits: 0,
    objectTagHits: 0,
    hardcodedColorHits: 0,
    dataBuildRefs: 0,
    toolsProductionRefs: 0,
  },
};

function walk(dir) {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) return;

  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const fullPath = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      walk(path.relative(root, fullPath));
      continue;
    }

    const ext = path.extname(entry.name);
    if (!EXTENSIONS.has(ext)) continue;

    const rel = path.relative(root, fullPath);
    const raw = fs.readFileSync(fullPath, "utf8");

    const inlineStyleCount = (raw.match(/\bstyle=/g) || []).length;
    const classListCount = (raw.match(/class:list=/g) || []).length;
    const objectTagCount = (raw.match(/<object[\s>]/g) || []).length;
    const hardcodedColorCount =
      (raw.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length +
      (raw.match(/\brgba?\(/g) || []).length;
    const dataBuildRefs = (raw.match(/src\/data\/build\//g) || []).length;
    const toolsProductionRefs = (raw.match(/tools_production\.json/g) || []).length;

    const item = {
      file: rel,
      ext,
      inlineStyleCount,
      classListCount,
      objectTagCount,
      hardcodedColorCount,
      dataBuildRefs,
      toolsProductionRefs,
      size: raw.length,
    };

    results.files.push(item);
    results.totals.files++;

    if (ext === ".astro") results.totals.astro++;
    if (ext === ".css") results.totals.css++;

    results.totals.inlineStyleHits += inlineStyleCount;
    results.totals.classListHits += classListCount;
    results.totals.objectTagHits += objectTagCount;
    results.totals.hardcodedColorHits += hardcodedColorCount;
    results.totals.dataBuildRefs += dataBuildRefs;
    results.totals.toolsProductionRefs += toolsProductionRefs;
  }
}

for (const dir of TARGET_DIRS) walk(dir);

const byInlineStyle = [...results.files]
  .filter((f) => f.inlineStyleCount > 0)
  .sort((a, b) => b.inlineStyleCount - a.inlineStyleCount)
  .slice(0, 25);

const byHardcodedColors = [...results.files]
  .filter((f) => f.hardcodedColorCount > 0)
  .sort((a, b) => b.hardcodedColorCount - a.hardcodedColorCount)
  .slice(0, 25);

const byLegacyRefs = [...results.files]
  .filter((f) => f.toolsProductionRefs > 0 || f.dataBuildRefs > 0)
  .sort((a, b) => (b.toolsProductionRefs + b.dataBuildRefs) - (a.toolsProductionRefs + a.dataBuildRefs))
  .slice(0, 25);

const out = {
  generated_at: new Date().toISOString(),
  summary: results.totals,
  top_inline_style_files: byInlineStyle,
  top_hardcoded_color_files: byHardcodedColors,
  top_data_reference_files: byLegacyRefs,
};

const outPath = path.join(root, "src/data/build/ui-foundation-audit.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

console.log("\nUI Foundation Audit");
console.log("===================");
console.log(`Files scanned:          ${results.totals.files}`);
console.log(`Astro files:            ${results.totals.astro}`);
console.log(`CSS files:              ${results.totals.css}`);
console.log(`Inline style hits:      ${results.totals.inlineStyleHits}`);
console.log(`class:list hits:        ${results.totals.classListHits}`);
console.log(`<object> tag hits:      ${results.totals.objectTagHits}`);
console.log(`Hardcoded color hits:   ${results.totals.hardcodedColorHits}`);
console.log(`Build data refs:        ${results.totals.dataBuildRefs}`);
console.log(`tools_production refs:  ${results.totals.toolsProductionRefs}`);
console.log(`\nSaved: ${outPath}\n`);