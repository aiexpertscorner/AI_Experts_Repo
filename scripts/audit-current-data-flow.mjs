import fs from "fs";
import path from "path";

const root = process.cwd();

const SEARCH_DIRS = [
  "src",
  "scripts"
];

const DATA_EXTENSIONS = [".json"];
const CODE_EXTENSIONS = [".js", ".mjs", ".ts", ".tsx", ".astro", ".md", ".mdx"];

function exists(p) {
  return fs.existsSync(path.join(root, p));
}

function walk(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      walk(full, filelist);
    } else {
      filelist.push(full);
    }
  }
  return filelist;
}

function printSection(title) {
  console.log("\n========================================");
  console.log(title);
  console.log("========================================\n");
}

function safeRead(file) {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return "";
  }
}

function getAllFiles() {
  const files = [];
  for (const dir of SEARCH_DIRS) {
    const full = path.join(root, dir);
    if (fs.existsSync(full)) {
      files.push(...walk(full));
    }
  }
  return files;
}

function getJsonFiles() {
  return getAllFiles().filter(f => DATA_EXTENSIONS.includes(path.extname(f)));
}

function getCodeFiles() {
  return getAllFiles().filter(f => CODE_EXTENSIONS.includes(path.extname(f)));
}

function getRelative(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function analyzeJsonReferences() {
  const jsonFiles = getJsonFiles();
  const codeFiles = getCodeFiles();

  printSection("JSON FILES FOUND");

  jsonFiles.forEach(f => {
    console.log(getRelative(f));
  });

  printSection("JSON REFERENCES IN CODE");

  for (const jsonFile of jsonFiles) {
    const base = path.basename(jsonFile);
    const refs = [];

    for (const codeFile of codeFiles) {
      const content = safeRead(codeFile);
      if (content.includes(base)) {
        refs.push(getRelative(codeFile));
      }
    }

    if (refs.length) {
      console.log(`\n${base}`);
      refs.forEach(ref => console.log(`  -> ${ref}`));
    }
  }
}

function analyzeLikelySourceFiles() {
  const jsonFiles = getJsonFiles().map(getRelative);

  const priorityPatterns = [
    "tools_production.json",
    "tools_enriched.json",
    "tools_normalized.json",
    "tools.json",
    "authority-tool-map.json",
    "global-top100.json",
    "category-top10.json"
  ];

  printSection("LIKELY IMPORTANT DATA FILES");

  for (const pattern of priorityPatterns) {
    const hits = jsonFiles.filter(f => f.endsWith(pattern));
    hits.forEach(hit => console.log(hit));
  }
}

function analyzeToolFieldCoverage() {
  const candidates = [
    "src/data/tools_production.json",
    "src/data/generated/tools_enriched.json",
    "src/data/generated/tools_normalized.json",
    "src/data/tools.json",
    "src/data/raw/tools_source.json"
  ];

  let selected = null;

  for (const c of candidates) {
    if (exists(c)) {
      selected = path.join(root, c);
      break;
    }
  }

  printSection("TOOL FIELD COVERAGE");

  if (!selected) {
    console.log("No known tools dataset found.");
    return;
  }

  console.log("Dataset:", getRelative(selected));

  let data;
  try {
    data = JSON.parse(safeRead(selected));
  } catch {
    console.log("Could not parse dataset.");
    return;
  }

  if (!Array.isArray(data)) {
    console.log("Dataset is not an array.");
    return;
  }

  const fieldCounts = {};
  const sampleSize = Math.min(data.length, 5000);

  for (let i = 0; i < sampleSize; i++) {
    const row = data[i];
    if (!row || typeof row !== "object") continue;

    for (const key of Object.keys(row)) {
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    }
  }

  Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([field, count]) => {
      console.log(`${field} -> ${count}/${sampleSize}`);
    });
}

function analyzeTop100Usage() {
  const codeFiles = getCodeFiles();
  const targets = [
    "global-top100.json",
    "category-top10.json",
    "authority-tool-map.json"
  ];

  printSection("CURATED OVERLAY USAGE");

  for (const target of targets) {
    const refs = [];
    for (const file of codeFiles) {
      const content = safeRead(file);
      if (content.includes(target)) {
        refs.push(getRelative(file));
      }
    }

    console.log(`\n${target}`);
    if (!refs.length) {
      console.log("  -> no direct reference found");
    } else {
      refs.forEach(ref => console.log(`  -> ${ref}`));
    }
  }
}

function analyzeRouteFiles() {
  const pagesDir = path.join(root, "src/pages");

  printSection("ROUTE FILES");

  if (!fs.existsSync(pagesDir)) {
    console.log("No src/pages found.");
    return;
  }

  const pageFiles = walk(pagesDir)
    .filter(f => [".astro", ".md", ".mdx"].includes(path.extname(f)));

  pageFiles.forEach(f => console.log(getRelative(f)));
}

printSection("AIEXPERTSCORNER CURRENT DATA FLOW AUDIT");

analyzeLikelySourceFiles();
analyzeJsonReferences();
analyzeTop100Usage();
analyzeToolFieldCoverage();
analyzeRouteFiles();

printSection("AUDIT COMPLETE");