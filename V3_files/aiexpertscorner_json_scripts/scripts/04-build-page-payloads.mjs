import path from "node:path";
import {
  loadContext,
  readJson,
  writeJson,
  toArray,
  deriveReadiness,
  deriveScore,
  slimTool,
} from "./00-shared.mjs";

const ctx = loadContext();
const buildDir = path.join(ctx.outputDir, "build");
const outDir = path.join(ctx.outputDir, "page-payloads");

const relatedToolsMap = readJson(path.join(buildDir, "related-tools-map.json"));
const compareMap = readJson(path.join(buildDir, "compare-map.json"));
const alternativesMap = readJson(path.join(buildDir, "alternatives-map.json"));
const categoryMap = readJson(path.join(buildDir, "category-map.json"));
const subcategoryMap = readJson(path.join(buildDir, "subcategory-map.json"));
const microcategoryMap = readJson(path.join(buildDir, "microcategory-map.json"));
const useCaseMap = readJson(path.join(buildDir, "use-case-map.json"));
const capabilityMap = readJson(path.join(buildDir, "capability-map.json"));
const integrationMap = readJson(path.join(buildDir, "integration-map.json"));

const toolPagePayloads = ctx.tools.map((tool) => {
  const readiness = deriveReadiness(tool, ctx.fieldDefinitions);
  return {
    slug: tool.slug,
    route: `/tools/${tool.slug}`,
    build_state: readiness.build_state,
    seo: {
      title: tool.seo_title || `${tool.display_name || tool.name} review, pricing, features & alternatives`,
      description: tool.meta_description || tool.short_description || "",
      schema_types: toArray(tool.schema_types),
      primary_keyword: tool.primary_keyword || null,
      secondary_keywords: toArray(tool.secondary_keywords),
    },
    hero: {
      name: tool.display_name || tool.name,
      tagline: tool.tagline || null,
      short_description: tool.short_description || null,
      logo_url: tool.logo_url || null,
      homepage_url: tool.homepage_url || null,
      pricing_url: tool.pricing_url || null,
      score_overall: deriveScore(tool),
    },
    taxonomy: {
      category: tool.category || null,
      subcategory: tool.subcategory || null,
      microcategory: tool.microcategory || null,
      categories: toArray(tool.categories),
      subcategories: toArray(tool.subcategories),
      microcategories: toArray(tool.microcategories),
      use_cases: toArray(tool.use_cases),
      capabilities: toArray(tool.capabilities),
      integrations: toArray(tool.integrations),
      platforms: toArray(tool.platforms),
      pricing_models: toArray(tool.pricing_models),
      skill_levels: toArray(tool.skill_levels),
    },
    commercial: {
      pricing_model: tool.pricing_model || null,
      freemium: tool.freemium ?? null,
      free_trial: tool.free_trial ?? null,
      trial_days: tool.trial_days ?? null,
      starting_price: tool.starting_price ?? null,
      entry_price_monthly: tool.entry_price_monthly ?? null,
      pro_price_monthly: tool.pro_price_monthly ?? null,
      team_price_monthly: tool.team_price_monthly ?? null,
      enterprise_price: tool.enterprise_price ?? null,
      pricing_notes: tool.pricing_notes || null,
    },
    features: {
      headline_features: toArray(tool.headline_features),
      core_features: toArray(tool.core_features),
      unique_features: toArray(tool.unique_features),
      ai_models: toArray(tool.ai_models),
    },
    trust: {
      company_name: tool.company_name || null,
      founded_year: tool.founded_year ?? null,
      hq_country: tool.hq_country || null,
      rating_average: tool.rating_average ?? null,
      review_count_total: tool.review_count_total ?? null,
      notable_customers: toArray(tool.notable_customers),
    },
    faq_items: toArray(tool.faq_items),
    related_tools: relatedToolsMap[tool.slug] || [],
    compare_candidates: compareMap[tool.slug] || [],
    alternatives: alternativesMap[tool.slug] || [],
  };
});

function entityPayload(routePrefix, entityList) {
  return entityList.map((entity) => ({
    slug: entity.slug,
    route: `${routePrefix}/${entity.slug}`,
    tool_count: entity.tool_count,
    top_tools: entity.top_tools,
    compare_seed_tools: entity.compare_seed_tools,
  }));
}

writeJson(path.join(outDir, "tool-page-payloads.json"), toolPagePayloads);
writeJson(path.join(outDir, "category-page-payloads.json"), entityPayload("/tools", categoryMap));
writeJson(path.join(outDir, "subcategory-page-payloads.json"), entityPayload("/subcategories", subcategoryMap));
writeJson(path.join(outDir, "microcategory-page-payloads.json"), entityPayload("/microcategories", microcategoryMap));
writeJson(path.join(outDir, "use-case-page-payloads.json"), entityPayload("/use-cases", useCaseMap));
writeJson(path.join(outDir, "capability-page-payloads.json"), entityPayload("/capabilities", capabilityMap));
writeJson(path.join(outDir, "integration-page-payloads.json"), entityPayload("/integrations", integrationMap));
writeJson(path.join(outDir, "tools-card-payloads.json"), ctx.tools.map(slimTool));

console.log(`Built page payloads for ${ctx.tools.length} tools.`);
console.log(`Output: ${outDir}`);
