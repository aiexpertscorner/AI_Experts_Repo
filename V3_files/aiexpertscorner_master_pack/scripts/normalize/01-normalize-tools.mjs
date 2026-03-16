import { PATHS, ensureBaseDirs, readToolsInput, writeJson, kebab, getDomainFromUrl, normalizePricingTier, toArray, uniq, num } from "../lib/shared.mjs";

ensureBaseDirs();

const rawTools = readToolsInput();

const normalized = rawTools.map((tool, index) => {
  const slug = tool.slug || tool.handle || kebab(tool.display_name || tool.name || `tool-${index + 1}`);
  const websiteUrl = tool.website_url || tool.url || tool.homepage_url || tool.app_url || "";
  const logoDomain = tool.logo_domain || getDomainFromUrl(websiteUrl);
  const pricingTier = normalizePricingTier(tool);

  return {
    ...tool,
    id: tool.id || slug,
    slug,
    handle: tool.handle || slug,
    name: tool.name || tool.display_name || slug,
    display_name: tool.display_name || tool.name || slug,
    website_url: websiteUrl,
    logo_domain: logoDomain,
    pricing_tier: pricingTier,
    tags: uniq(toArray(tool.tags)),
    feature_tags: uniq(toArray(tool.feature_tags)),
    categories: uniq(toArray(tool.categories || tool.category)),
    subcategories: uniq(toArray(tool.subcategories || tool.subcategory)),
    microcategories: uniq(toArray(tool.microcategories || tool.microcategory)),
    use_cases: uniq(toArray(tool.use_cases)),
    capabilities: uniq(toArray(tool.capabilities)),
    industries: uniq(toArray(tool.industries)),
    integrations: uniq(toArray(tool.integrations)),
    ai_models: uniq(toArray(tool.ai_models)),
    platforms: uniq(toArray(tool.platforms)),
    pricing_models: uniq(toArray(tool.pricing_models || tool.pricing_model)),
    skill_levels: uniq(toArray(tool.skill_levels)),
    rating_average: num(tool.rating_average, 0),
    review_count_total: num(tool.review_count_total, 0)
  };
});

const slugCounts = normalized.reduce((acc, tool) => {
  acc[tool.slug] = (acc[tool.slug] || 0) + 1;
  return acc;
}, {});

const deduped = normalized.map((tool, index) => {
  if (slugCounts[tool.slug] === 1) return tool;
  return { ...tool, slug: `${tool.slug}-${index + 1}` };
});

writeJson(PATHS.normalizedTools, deduped);
console.log(`Normalized ${deduped.length} tools.`);
