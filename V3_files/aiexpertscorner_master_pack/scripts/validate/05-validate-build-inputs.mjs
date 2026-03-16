import { PATHS, ensureBaseDirs, readJson, writeJson, getDomainFromUrl } from "../lib/shared.mjs";

ensureBaseDirs();

const tools = readJson(PATHS.enrichedTools, []);
const summary = {
  tool_count: tools.length,
  missing_slug: 0,
  missing_name: 0,
  missing_category: 0,
  low_taxonomy_confidence: 0,
  invalid_website_url: 0,
  build_eligible: 0,
  review_needed: 0
};
const issues = [];

for (const tool of tools) {
  if (!tool.slug) {
    summary.missing_slug++;
    issues.push({ slug: null, type: "missing_slug" });
  }
  if (!tool.name && !tool.display_name) {
    summary.missing_name++;
    issues.push({ slug: tool.slug, type: "missing_name" });
  }
  if (!tool.category) {
    summary.missing_category++;
    issues.push({ slug: tool.slug, type: "missing_category" });
  }
  if ((tool.taxonomy_confidence_score || 0) < 40) {
    summary.low_taxonomy_confidence++;
    issues.push({ slug: tool.slug, type: "low_taxonomy_confidence", score: tool.taxonomy_confidence_score || 0 });
  }
  if ((tool.website_url || tool.url || tool.homepage_url) && !getDomainFromUrl(tool.website_url || tool.url || tool.homepage_url)) {
    summary.invalid_website_url++;
    issues.push({ slug: tool.slug, type: "invalid_website_url" });
  }
  if (tool.build_eligibility === "eligible") summary.build_eligible++;
  else summary.review_needed++;
}

writeJson(`${PATHS.reviewDir}/validation-summary.json`, summary);
writeJson(`${PATHS.reviewDir}/validation-issues.json`, issues);
console.log(`Validated ${tools.length} tools.`);
