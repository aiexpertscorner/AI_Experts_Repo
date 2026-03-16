import { PATHS, ensureBaseDirs, readJson, writeJson, fingerprintTool, deriveScore, normalizePricingTier, getDomainFromUrl, num, toArray, uniq, clamp } from "../lib/shared.mjs";

ensureBaseDirs();

const tools = readJson(PATHS.taxonomyTools, []);
const previousEnriched = readJson(PATHS.enrichedTools, []);
const previousMap = Object.fromEntries(previousEnriched.map((tool) => [tool.slug, tool]));
const previousFingerprints = readJson(PATHS.fingerprints, {});

const mode = process.env.ENRICH_MODE || "full";
const fingerprints = {};
const changed = [];
const enriched = tools.map((tool) => {
  const fingerprint = fingerprintTool(tool);
  fingerprints[tool.slug] = fingerprint;
  const isChanged = previousFingerprints[tool.slug] !== fingerprint;
  if (isChanged) changed.push(tool.slug);

  if (mode === "incremental" && !isChanged && previousMap[tool.slug]) {
    return previousMap[tool.slug];
  }

  const scoreOverall = num(tool.score_overall, deriveScore(tool));
  const contentReadinessScore = clamp(
    scoreOverall +
    (tool.category ? 10 : 0) +
    (tool.subcategory ? 8 : 0) +
    Math.min(toArray(tool.use_cases).length * 2, 10) +
    Math.min(toArray(tool.capabilities).length * 2, 10) +
    (tool.logo_url || tool.logo_domain ? 4 : 0) +
    (tool.description || tool.short_description || tool.short || tool.desc ? 8 : 0)
  );

  const monetizationReadiness = clamp(
    (tool.affiliate_url ? 30 : 0) +
    (normalizePricingTier(tool) !== "unknown" ? 15 : 0) +
    (tool.pricing_url ? 10 : 0) +
    Math.min(num(tool.review_count_total, 0) / 10, 20) +
    (scoreOverall / 4)
  );

  return {
    ...tool,
    pricing_tier: normalizePricingTier(tool),
    logo_domain: tool.logo_domain || getDomainFromUrl(tool.website_url || tool.url || tool.homepage_url || ""),
    score_overall: scoreOverall,
    score_bestof_value: num(tool.score_bestof_value, Math.round(scoreOverall * 0.85)),
    score_compare_value: num(tool.score_compare_value, Math.round(scoreOverall * 0.8)),
    score_seo_value: num(tool.score_seo_value, Math.round(scoreOverall * 0.82)),
    score_aeo_value: num(tool.score_aeo_value, Math.round(scoreOverall * 0.78)),
    score_geo_value: num(tool.score_geo_value, Math.round(scoreOverall * 0.76)),
    score_workflow_fit: num(tool.score_workflow_fit, Math.round((toArray(tool.integrations).length * 7) + (toArray(tool.capabilities).length * 5))),
    content_readiness_score: contentReadinessScore,
    monetization_readiness_score: monetizationReadiness,
    compare_candidates: uniq(toArray(tool.compare_candidates)),
    alternatives: uniq(toArray(tool.alternatives)),
    build_eligibility: contentReadinessScore >= 45 ? "eligible" : "review",
    last_enriched_at: new Date().toISOString()
  };
});

writeJson(PATHS.enrichedTools, enriched);
writeJson(PATHS.fingerprints, fingerprints);
writeJson(`${PATHS.reviewDir}/enrichment-changed-tools.json`, changed);
console.log(`Enriched ${enriched.length} tools. Mode: ${mode}. Changed: ${changed.length}.`);
