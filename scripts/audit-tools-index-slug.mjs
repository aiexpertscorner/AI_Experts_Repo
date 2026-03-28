import fs from "fs";
import path from "path";

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const targetAstro = path.join(ROOT, "src", "pages", "tools", "index.astro");
const distChunksDir = path.join(ROOT, "dist", "chunks");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function getLines(text, start, end) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = start; i <= end && i <= lines.length; i++) {
    out.push(`${i}: ${lines[i - 1]}`);
  }
  return out;
}

function parseImports(text) {
  const imports = [];
  const regex =
    /import\s+[^'"]*?from\s+['"]([^'"]+)['"];?|import\s+['"]([^'"]+)['"];?/g;
  let m;
  while ((m = regex.exec(text))) {
    imports.push(m[1] || m[2]);
  }
  return [...new Set(imports)];
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.astro`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.ts`,
    `${base}.json`,
    path.join(base, "index.astro"),
    path.join(base, "index.js"),
    path.join(base, "index.mjs"),
    path.join(base, "index.ts"),
    path.join(base, "index.json"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function findInterestingLines(text) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  const rxList = [
    /\.slug\b/,
    /\?\.\s*slug\b/,
    /\bslug\b/,
    /\.map\s*\(/,
    /\.find\s*\(/,
    /\.filter\s*\(/,
    /\.flatMap\s*\(/,
    /\[[^\]]+\]\.slug/,
    /return .*slug/,
  ];

  lines.forEach((line, i) => {
    if (rxList.some((rx) => rx.test(line))) {
      hits.push(`${i + 1}: ${line}`);
    }
  });

  return hits;
}

const astroText = read(targetAstro);

if (!astroText) {
  console.error("Target file not found:", targetAstro);
  process.exit(1);
}

console.log("\n=== TOOLS INDEX TRACE AUDIT ===\n");

console.log("TARGET:");
console.log(targetAstro);
console.log("");

console.log("TOOLS INDEX CONTENT:");
console.log(getLines(astroText, 1, 250).join("\n"));
console.log("");

const imports = parseImports(astroText);
console.log("IMPORTS:");
for (const spec of imports) {
  const resolved = resolveImport(targetAstro, spec);
  console.log(`- ${spec} -> ${resolved || "UNRESOLVED/ALIased"}`);
}
console.log("");

console.log("TOOLS INDEX INTERESTING LINES:");
console.log(findInterestingLines(astroText).join("\n") || "(none)");
console.log("");

let chunkFile = null;
if (fs.existsSync(distChunksDir)) {
  const files = fs.readdirSync(distChunksDir);
  chunkFile = files.find((f) => /^homepage-data_.*\.mjs$/i.test(f));
}

if (!chunkFile) {
  console.log("No homepage-data chunk found in dist/chunks");
  process.exit(0);
}

const chunkPath = path.join(distChunksDir, chunkFile);
const chunkText = read(chunkPath);

console.log("DIST CHUNK:");
console.log(chunkPath);
console.log("");

console.log("CHUNK LINES 1-60:");
console.log(getLines(chunkText, 1, 60).join("\n"));
console.log("");

console.log("CHUNK INTERESTING LINES:");
console.log(findInterestingLines(chunkText).join("\n") || "(none)");
console.log("");