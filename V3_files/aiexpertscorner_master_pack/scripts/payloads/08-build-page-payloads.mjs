import { PATHS, ensureBaseDirs, readJson, writeJson, toolCardSlim, toArray } from "../lib/shared.mjs";

ensureBaseDirs();

const tools = readJson(PATHS.enrichedTools, []);
const manifest = readJson(`${PATHS.buildDir}/page-manifest.json`, []);
const registries = readJson(`${PATHS.taxonomyDir}/taxonomy-registries.json`, {});
const relatedMap = readJson(`${PATHS.graphsDir}/related-tools.json`, {});
const compareMap = readJson(`${PATHS.graphsDir}/compare-map.json`, {});
const alternativesMap = readJson(`${PATHS.graphsDir}/alternatives-map.json`, {});
const entityLeaders = readJson(`${PATHS.graphsDir}/entity-leaders.json`, {});

const toolMap = Object.fromEntries(tools.map((tool) => [tool.slug, tool]));

function entityPayloadFor(bucketName, entitySlug) {
  const leaders = entityLeaders[bucketName]?.[entitySlug] || [];
  return leaders.map((slug) => toolCardSlim(toolMap[slug])).filter(Boolean);
}

const toolPayloads = manifest
  .filter((item) => item.type === "tool_detail")
  .map((item) => {
    const tool = toolMap[item.entity_slug];
    if (!tool) return null;
    return {
      slug: item.entity_slug,
      route: item.slug,
      seo: {
        title: tool.seo_title || `${tool.display_name || tool.name} review, pricing, features and alternatives`,
        description: tool.meta_description || tool.short_description || tool.short || tool.desc || ""
      },
      hero: {
        name: tool.display_name || tool.name,
        tagline: tool.tagline || null,
        logo_url: tool.logo_url || null,
        logo_domain: tool.logo_domain || null,
        website_url: tool.website_url || tool.url || null,
        pricing_tier: tool.pricing_tier || null,
        score_overall: tool.score_overall || null
      },
      taxonomy: {
        category: tool.category || null,
        subcategory: tool.subcategory || null,
        microcategory: tool.microcategory || null,
        use_cases: toArray(tool.use_cases),
        capabilities: toArray(tool.capabilities),
        industries: toArray(tool.industries),
        integrations: toArray(tool.integrations),
        ai_models: toArray(tool.ai_models)
      },
      sections: {
        feature_tags: toArray(tool.feature_tags),
        tags: toArray(tool.tags),
        related_tools: (relatedMap[tool.slug] || []).map((slug) => toolCardSlim(toolMap[slug])).filter(Boolean),
        compare_candidates: (compareMap[tool.slug] || []).map((slug) => toolCardSlim(toolMap[slug])).filter(Boolean),
        alternatives: (alternativesMap[tool.slug] || []).map((slug) => toolCardSlim(toolMap[slug])).filter(Boolean)
      }
    };
  })
  .filter(Boolean);

function buildEntityFamilyPayload(type, bucketName) {
  return manifest
    .filter((item) => item.type === type)
    .map((item) => ({
      slug: item.entity_slug,
      route: item.slug,
      top_tools: entityPayloadFor(bucketName, item.entity_slug)
    }));
}

writeJson(`${PATHS.payloadsDir}/tool-pages.json`, toolPayloads);
writeJson(`${PATHS.payloadsDir}/category-pages.json`, buildEntityFamilyPayload("category_page", "categories"));
writeJson(`${PATHS.payloadsDir}/subcategory-pages.json`, buildEntityFamilyPayload("subcategory_page", "subcategories"));
writeJson(`${PATHS.payloadsDir}/microcategory-pages.json`, buildEntityFamilyPayload("microcategory_page", "microcategories"));
writeJson(`${PATHS.payloadsDir}/capability-pages.json`, buildEntityFamilyPayload("capability_page", "capabilities"));
writeJson(`${PATHS.payloadsDir}/use-case-pages.json`, buildEntityFamilyPayload("use_case_page", "use_cases"));
writeJson(`${PATHS.payloadsDir}/industry-pages.json`, buildEntityFamilyPayload("industry_page", "industries"));
writeJson(`${PATHS.payloadsDir}/integration-pages.json`, buildEntityFamilyPayload("integration_page", "integrations"));
writeJson(`${PATHS.payloadsDir}/ai-model-pages.json`, buildEntityFamilyPayload("ai_model_page", "ai_models"));
writeJson(`${PATHS.payloadsDir}/workflow-pages.json`, buildEntityFamilyPayload("workflow_page", "workflows"));
writeJson(`${PATHS.payloadsDir}/automation-pages.json`, buildEntityFamilyPayload("automation_recipe_page", "automation_recipes"));
writeJson(`${PATHS.payloadsDir}/stack-pages.json`, buildEntityFamilyPayload("stack_page", "stacks"));
writeJson(`${PATHS.payloadsDir}/compare-pages.json`, manifest.filter((item) => item.type === "compare_page"));
writeJson(`${PATHS.payloadsDir}/alternatives-pages.json`, manifest.filter((item) => item.type === "alternatives_page"));

console.log(`Built page payloads from manifest ${manifest.length}.`);
