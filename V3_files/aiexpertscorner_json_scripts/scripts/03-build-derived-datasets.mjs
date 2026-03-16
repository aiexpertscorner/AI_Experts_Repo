import path from "node:path";
import {
  loadContext,
  writeJson,
  toArray,
  uniq,
  deriveScore,
  deriveReadiness,
  slimTool,
} from "./00-shared.mjs";

const ctx = loadContext();
const outDir = path.join(ctx.outputDir, "build");

function byScoreDesc(a, b) {
  return deriveScore(b) - deriveScore(a) || (a.slug || "").localeCompare(b.slug || "");
}

const indexedTools = ctx.tools.filter((tool) => deriveReadiness(tool, ctx.fieldDefinitions).build_state !== "skip");

const categoryMap = {};
const subcategoryMap = {};
const microcategoryMap = {};
const useCaseMap = {};
const capabilityMap = {};
const integrationMap = {};
const pricingModelMap = {};

function pushEntity(map, key, tool) {
  if (!key) return;
  if (!map[key]) map[key] = [];
  map[key].push(tool);
}

for (const tool of indexedTools) {
  for (const value of uniq([tool.category, ...toArray(tool.categories)])) pushEntity(categoryMap, value, tool);
  for (const value of uniq([tool.subcategory, ...toArray(tool.subcategories)])) pushEntity(subcategoryMap, value, tool);
  for (const value of uniq([tool.microcategory, ...toArray(tool.microcategories)])) pushEntity(microcategoryMap, value, tool);
  for (const value of toArray(tool.use_cases)) pushEntity(useCaseMap, value, tool);
  for (const value of toArray(tool.capabilities)) pushEntity(capabilityMap, value, tool);
  for (const value of toArray(tool.integrations)) pushEntity(integrationMap, value, tool);
  for (const value of uniq([tool.pricing_model, ...toArray(tool.pricing_models)])) pushEntity(pricingModelMap, value, tool);
}

function packEntityMap(map, kind) {
  return Object.entries(map)
    .map(([slug, tools]) => {
      const sorted = [...tools].sort(byScoreDesc);
      return {
        slug,
        kind,
        tool_count: sorted.length,
        top_tools: sorted.slice(0, 12).map(slimTool),
        compare_seed_tools: sorted.slice(0, 5).map((t) => ({ slug: t.slug, name: t.display_name || t.name })),
      };
    })
    .sort((a, b) => b.tool_count - a.tool_count || a.slug.localeCompare(b.slug));
}

function overlapScore(a, b) {
  const fields = ["categories", "subcategories", "microcategories", "use_cases", "capabilities", "integrations"];
  let score = 0;
  for (const field of fields) {
    const A = new Set(toArray(a[field]));
    const B = new Set(toArray(b[field]));
    for (const item of A) if (B.has(item)) score += 1;
  }
  if (a.category && a.category === b.category) score += 2;
  if (a.subcategory && a.subcategory === b.subcategory) score += 2;
  if (a.microcategory && a.microcategory === b.microcategory) score += 2;
  return score;
}

const relatedToolsMap = {};
const compareMap = {};
const alternativesMap = {};

for (const tool of indexedTools) {
  const others = indexedTools.filter((x) => x.slug !== tool.slug);
  const scored = others
    .map((other) => ({
      slug: other.slug,
      name: other.display_name || other.name,
      score: overlapScore(tool, other) + Math.round(deriveScore(other) / 20),
      direct_compare: toArray(tool.compare_candidates).includes(other.slug) || toArray(other.compare_candidates).includes(tool.slug),
      direct_alternative: toArray(tool.alternatives).includes(other.slug) || toArray(other.alternatives).includes(tool.slug),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));

  relatedToolsMap[tool.slug] = scored.slice(0, 12);
  compareMap[tool.slug] = scored.filter((x) => x.direct_compare || x.score >= 7).slice(0, 8);
  alternativesMap[tool.slug] = scored.filter((x) => x.direct_alternative || x.score >= 6).slice(0, 10);
}

const bestCategoryMap = packEntityMap(categoryMap, "category");
const bestSubcategoryMap = packEntityMap(subcategoryMap, "subcategory");
const bestMicrocategoryMap = packEntityMap(microcategoryMap, "microcategory");

writeJson(path.join(outDir, "category-map.json"), packEntityMap(categoryMap, "category"));
writeJson(path.join(outDir, "subcategory-map.json"), packEntityMap(subcategoryMap, "subcategory"));
writeJson(path.join(outDir, "microcategory-map.json"), packEntityMap(microcategoryMap, "microcategory"));
writeJson(path.join(outDir, "use-case-map.json"), packEntityMap(useCaseMap, "use_case"));
writeJson(path.join(outDir, "capability-map.json"), packEntityMap(capabilityMap, "capability"));
writeJson(path.join(outDir, "integration-map.json"), packEntityMap(integrationMap, "integration"));
writeJson(path.join(outDir, "pricing-model-map.json"), packEntityMap(pricingModelMap, "pricing_model"));
writeJson(path.join(outDir, "related-tools-map.json"), relatedToolsMap);
writeJson(path.join(outDir, "compare-map.json"), compareMap);
writeJson(path.join(outDir, "alternatives-map.json"), alternativesMap);
writeJson(path.join(outDir, "best-category-map.json"), bestCategoryMap);
writeJson(path.join(outDir, "best-subcategory-map.json"), bestSubcategoryMap);
writeJson(path.join(outDir, "best-microcategory-map.json"), bestMicrocategoryMap);
writeJson(path.join(outDir, "tools-slim.json"), indexedTools.map(slimTool).sort((a, b) => b.score_overall - a.score_overall));
writeJson(path.join(outDir, "build-meta.json"), {
  generated_at: new Date().toISOString(),
  source_tool_count: ctx.tools.length,
  indexed_tool_count: indexedTools.length,
  category_count: Object.keys(categoryMap).length,
  subcategory_count: Object.keys(subcategoryMap).length,
  microcategory_count: Object.keys(microcategoryMap).length,
  use_case_count: Object.keys(useCaseMap).length,
  capability_count: Object.keys(capabilityMap).length,
  integration_count: Object.keys(integrationMap).length,
});

console.log(`Built derived datasets for ${indexedTools.length} eligible tools.`);
console.log(`Output: ${outDir}`);
