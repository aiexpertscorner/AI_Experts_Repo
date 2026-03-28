import fs   from "node:fs";
import path from "node:path";

const ROOT      = process.cwd();
const TOOL_LIMIT    = parseInt(process.env.TOOL_PAGE_LIMIT    || "9999", 10);
const COMPARE_LIMIT = parseInt(process.env.COMPARE_PAGE_LIMIT || "9999", 10);

// Trim tool-slugs.json
const slugsPath = path.join(ROOT, "src/data/build/tool-slugs.json");
const slugs = JSON.parse(fs.readFileSync(slugsPath, "utf8"));
if (slugs.length > TOOL_LIMIT) {
  fs.writeFileSync(slugsPath, JSON.stringify(slugs.slice(0, TOOL_LIMIT)));
  console.log(tool-slugs.json: trimmed to ${TOOL_LIMIT} (was ${slugs.length}));
}

// Trim compare-pages-rich.json
const cmpPath = path.join(ROOT, "src/data/build/page-payloads/compare-pages-rich.json");
const cmps = JSON.parse(fs.readFileSync(cmpPath, "utf8"));
if (cmps.length > COMPARE_LIMIT) {
  fs.writeFileSync(cmpPath, JSON.stringify(cmps.slice(0, COMPARE_LIMIT)));
  console.log(compare-pages-rich.json: trimmed to ${COMPARE_LIMIT} (was ${cmps.length}));
}

console.log("trim-for-build done");