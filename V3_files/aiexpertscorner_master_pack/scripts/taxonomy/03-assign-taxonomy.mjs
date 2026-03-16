import { PATHS, ensureBaseDirs, readJson, writeJson, stringBlob, uniq } from "../lib/shared.mjs";

ensureBaseDirs();

const tools = readJson(PATHS.normalizedTools, []);
const registries = readJson(`${PATHS.taxonomyDir}/taxonomy-registries.json`, {});
const aliases = readJson(`${PATHS.configDir}/entity-aliases.json`, readJson(`${PATHS.configDir}/entity-aliases.sample.json`, {})) || {};
const overrides = readJson(`${PATHS.configDir}/manual-overrides.json`, readJson(`${PATHS.configDir}/manual-overrides.sample.json`, {})) || {};

function scoreBlob(blob, needles = []) {
  let score = 0;
  for (const needleRaw of needles) {
    const needle = String(needleRaw || "").toLowerCase().trim();
    if (!needle) continue;
    if (blob.includes(needle)) score += needle.split(" ").length > 1 ? 3 : 1;
  }
  return score;
}

function bestSingle(blob, registryItems = [], aliasMap = {}) {
  let best = null;
  for (const item of registryItems) {
    const aliasesForItem = [item.name, item.slug.replace(/-/g, " "), ...(aliasMap[item.slug] || [])];
    const score = scoreBlob(blob, aliasesForItem);
    if (!best || score > best.score) best = { slug: item.slug, score, item };
  }
  return best && best.score > 0 ? best : null;
}

function multiAssign(blob, registryItems = [], aliasMap = {}) {
  return registryItems
    .map((item) => {
      const aliasesForItem = [item.name, item.slug.replace(/-/g, " "), ...(aliasMap[item.slug] || [])];
      return { slug: item.slug, score: scoreBlob(blob, aliasesForItem) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, 8)
    .map((x) => x.slug);
}

const reviewQueue = [];

const assigned = tools.map((tool) => {
  const blob = stringBlob(tool);
  const override = overrides[tool.slug] || {};

  const category = override.category || bestSingle(blob, registries.categories, aliases.categories || {})?.slug || tool.category || "";
  const subcategory = override.subcategory || bestSingle(blob, registries.subcategories, aliases.subcategories || {})?.slug || tool.subcategory || "";
  const microcategory = override.microcategory || bestSingle(blob, registries.microcategories, aliases.microcategories || {})?.slug || tool.microcategory || "";
  const useCases = override.use_cases || multiAssign(blob, registries.use_cases, aliases.use_cases || {});
  const capabilities = override.capabilities || multiAssign(blob, registries.capabilities, aliases.capabilities || {});
  const industries = override.industries || multiAssign(blob, registries.industries, aliases.industries || {});
  const integrations = override.integrations || multiAssign(blob, registries.integrations, aliases.integrations || {});
  const aiModels = override.ai_models || multiAssign(blob, registries.ai_models, aliases.ai_models || {});
  const tags = override.tags || multiAssign(blob, registries.tags, aliases.tags || {});

  const confidence = Math.min(
    100,
    (category ? 30 : 0) +
    (subcategory ? 20 : 0) +
    (microcategory ? 15 : 0) +
    Math.min(useCases.length * 5, 15) +
    Math.min(capabilities.length * 5, 15) +
    Math.min(integrations.length * 2, 5)
  );

  const manualReviewStatus = confidence < 40 ? "pending" : "auto-approved";
  if (manualReviewStatus === "pending") {
    reviewQueue.push({
      slug: tool.slug,
      name: tool.display_name || tool.name,
      confidence,
      category,
      subcategory,
      microcategory,
      website_url: tool.website_url || null
    });
  }

  return {
    ...tool,
    category,
    subcategory,
    microcategory,
    categories: uniq([category, ...(tool.categories || [])]),
    subcategories: uniq([subcategory, ...(tool.subcategories || [])]),
    microcategories: uniq([microcategory, ...(tool.microcategories || [])]),
    use_cases: uniq(useCases),
    capabilities: uniq(capabilities),
    industries: uniq(industries),
    integrations: uniq(integrations),
    ai_models: uniq(aiModels),
    tags: uniq([...(tool.tags || []), ...tags]),
    taxonomy_confidence_score: confidence,
    manual_review_status: manualReviewStatus
  };
});

writeJson(PATHS.taxonomyTools, assigned);
writeJson(`${PATHS.reviewDir}/taxonomy-review-queue.json`, reviewQueue.sort((a, b) => a.confidence - b.confidence));
console.log(`Assigned taxonomy to ${assigned.length} tools.`);
