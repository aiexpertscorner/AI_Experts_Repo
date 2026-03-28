import fs   from "node:fs";
import path from "node:path";

const ROOT       = process.cwd();
const TOOL_LIMIT = parseInt(process.env.TOOL_PAGE_LIMIT    || "9999", 10);
const CMP_LIMIT  = parseInt(process.env.COMPARE_PAGE_LIMIT || "9999", 10);

console.log("trim-for-build: TOOL_LIMIT=" + TOOL_LIMIT + "  CMP_LIMIT=" + CMP_LIMIT);

const slugsPath = path.join(ROOT, "src/data/build/tool-slugs.json");
if (fs.existsSync(slugsPath)) {
  const slugs = JSON.parse(fs.readFileSync(slugsPath, "utf8"));
  if (slugs.length > TOOL_LIMIT) {
    fs.writeFileSync(slugsPath, JSON.stringify(slugs.slice(0, TOOL_LIMIT)));
    console.log("  tool-slugs.json: " + slugs.length + " -> " + TOOL_LIMIT);
  } else {
    console.log("  tool-slugs.json: " + slugs.length + " (no trim needed)");
  }
}

const cmpPath = path.join(ROOT, "src/data/build/page-payloads/compare-pages-rich.json");
if (fs.existsSync(cmpPath)) {
  const cmps = JSON.parse(fs.readFileSync(cmpPath, "utf8"));
  if (cmps.length > CMP_LIMIT) {
    fs.writeFileSync(cmpPath, JSON.stringify(cmps.slice(0, CMP_LIMIT)));
    console.log("  compare-pages-rich.json: " + cmps.length + " -> " + CMP_LIMIT);
  } else {
    console.log("  compare-pages-rich.json: " + cmps.length + " (no trim needed)");
  }
}

console.log("trim-for-build done");
