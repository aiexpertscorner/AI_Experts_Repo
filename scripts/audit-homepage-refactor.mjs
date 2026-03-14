import fs from "fs";
import path from "path";

const root = process.cwd();

const FILES = [
  "src/pages/index.astro",
  "src/layouts/BaseLayout.astro",
  "src/components/site/Header.astro",
  "src/components/site/Footer.astro",
  "src/components/site/CategoryIcon.astro",
  "src/components/cards/ToolCard.astro",
  "src/components/cards/CategoryCard.astro",
  "src/components/sections/HeroSection.astro",
  "src/components/sections/FlagshipToolsSection.astro",
  "src/components/sections/CategoryDiscoverySection.astro",
  "src/components/sections/PopularToolsSection.astro",
  "src/components/sections/BestOfSection.astro",
  "src/components/sections/HomeEditorialSection.astro",
  "src/components/sections/NewsletterSection.astro",
  "src/styles/tokens.css",
  "src/styles/base.css",
  "src/styles/components.css",
  "src/styles/layout.css",
  "src/styles/homepage.css",
  "src/data/homeConfig.ts",
  "src/data/categoryIcons.ts",
];

function safeRead(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    return { exists: false, content: "" };
  }
  return { exists: true, content: fs.readFileSync(abs, "utf8") };
}

function extractClassesFromAstro(content) {
  const classes = new Set();

  const classAttrRegex = /class=(["'`])([\s\S]*?)\1/g;
  for (const match of content.matchAll(classAttrRegex)) {
    const raw = match[2];
    raw
      .split(/\s+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((c) => {
        if (!/[{}]/.test(c)) classes.add(c);
      });
  }

  const classListRegex = /class:list=\{([\s\S]*?)\}/g;
  for (const match of content.matchAll(classListRegex)) {
    const raw = match[1];
    const stringMatches = [...raw.matchAll(/["'`]([^"'`]+)["'`]/g)];
    for (const sm of stringMatches) {
      sm[1]
        .split(/\s+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((c) => classes.add(c));
    }
  }

  return [...classes].sort();
}

function extractCssSelectors(content) {
  const selectors = new Set();
  for (const match of content.matchAll(/\.([a-zA-Z0-9_-]+)\b/g)) {
    selectors.add(match[1]);
  }
  return [...selectors].sort();
}

function extractCssVarsUsed(content) {
  const vars = new Set();
  for (const match of content.matchAll(/var\((--[a-zA-Z0-9_-]+)\)/g)) {
    vars.add(match[1]);
  }
  return [...vars].sort();
}

function extractCssVarsDefined(content) {
  const vars = new Set();
  for (const match of content.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) {
    vars.add(match[1]);
  }
  return [...vars].sort();
}

function extractImports(content) {
  return [...content.matchAll(/import\s+.*?from\s+["'](.+?)["']/g)].map((m) => m[1]);
}

function hasSuspiciousLiteral(content) {
  const patterns = [
    /#\{rank\}/,
    /src="\{.*?\}"/,
    /```/,
    /style=/,
  ];
  return patterns.filter((p) => p.test(content)).map((p) => p.toString());
}

const fileReports = [];
const astroClasses = new Set();
const cssSelectors = new Set();
const allCssVarsUsed = new Set();
const allCssVarsDefined = new Set();

for (const rel of FILES) {
  const { exists, content } = safeRead(rel);

  const report = {
    file: rel,
    exists,
    lines: exists ? content.split("\n").length : 0,
    imports: exists ? extractImports(content) : [],
    classes: exists && rel.endsWith(".astro") ? extractClassesFromAstro(content) : [],
    selectors: exists && rel.endsWith(".css") ? extractCssSelectors(content) : [],
    vars_used: exists && rel.endsWith(".css") ? extractCssVarsUsed(content) : [],
    vars_defined: exists && rel.endsWith(".css") ? extractCssVarsDefined(content) : [],
    suspicious: exists ? hasSuspiciousLiteral(content) : [],
  };

  report.classes.forEach((c) => astroClasses.add(c));
  report.selectors.forEach((s) => cssSelectors.add(s));
  report.vars_used.forEach((v) => allCssVarsUsed.add(v));
  report.vars_defined.forEach((v) => allCssVarsDefined.add(v));

  fileReports.push(report);
}

const missingSelectors = [...astroClasses].filter((c) => !cssSelectors.has(c)).sort();
const undefinedVars = [...allCssVarsUsed].filter((v) => !allCssVarsDefined.has(v)).sort();

const result = {
  generated_at: new Date().toISOString(),
  files: fileReports,
  summary: {
    total_files: fileReports.length,
    missing_files: fileReports.filter((f) => !f.exists).map((f) => f.file),
    suspicious_files: fileReports.filter((f) => f.suspicious.length > 0).map((f) => ({
      file: f.file,
      suspicious: f.suspicious,
    })),
    astro_classes_without_css: missingSelectors,
    css_vars_used_but_not_defined: undefinedVars,
  },
};

const outPath = path.join(root, "src/data/build/homepage-refactor-audit.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");

console.log("\nHomepage Refactor Audit");
console.log("=======================");
console.log(`Files checked: ${fileReports.length}`);
console.log(`Missing files: ${result.summary.missing_files.length}`);
console.log(`Suspicious files: ${result.summary.suspicious_files.length}`);
console.log(`Astro classes without CSS selectors: ${missingSelectors.length}`);
console.log(`CSS vars used but not defined: ${undefinedVars.length}`);
console.log(`Saved: ${outPath}\n`);