# JSON Intelligence Audit Summary

Generated at: 2026-03-17T00:37:16.282Z

## Dataset inventory

- `data/raw/tools_source.json` → raw_candidate, 7.63 MB, 19466 records
- `data/staging/normalized/tools_normalized.json` → normalized_candidate, 218.26 MB, 19488 records
- `data/staging/enriched/tools_production.current.json` → enriched_candidate, 67.95 MB, 19488 records
- `data/master/tools_master.seed.json` → master_candidate, 144.65 MB, 19488 records
- `data/master/tools_master.json` → master_candidate, 289.24 MB, 19488 records
- `src/data/build/authority-tool-map.json` → derived_build, 0.05 MB, 99 records
- `src/data/build/global-top100.json` → derived_build, 0.04 MB, 100 records
- `src/data/build/category-top10.json` → derived_build, 0.3 MB
- `src/data/build/featured-tools.json` → object_dataset, 0.36 MB
- `src/data/build/homepage-data.json` → page_payload, 0.02 MB
- `src/data/build/alternatives-map.json` → derived_build, 30.99 MB
- `src/data/build/alternatives-page-data.json` → page_payload, 8.83 MB, 5000 records
- `src/data/build/best-of-map.json` → derived_build, 2.65 MB, 95 records
- `src/data/build/best-of-paths.json` → derived_build, 0 MB, 95 records
- `src/data/build/compare-map.json` → derived_build, 1.48 MB
- `src/data/build/compare-page-data.json` → page_payload, 3.68 MB, 3000 records
- `src/data/build/compare-pairs.json` → record_dataset, 5.59 MB, 73216 records
- `src/data/build/related-map.json` → derived_build, 30.99 MB
- `src/data/build/category-map.json` → derived_build, 1.74 MB, 23 records
- `src/data/build/category-paths.json` → derived_build, 0 MB, 23 records
- `src/data/build/category-stats.json` → derived_build, 0 MB
- `src/data/build/feature-map.json` → derived_build, 0.68 MB, 11 records
- `src/data/build/feature-paths.json` → derived_build, 0 MB, 11 records
- `src/data/build/industry-map.json` → derived_build, 0.89 MB, 14 records
- `src/data/build/industry-paths.json` → derived_build, 0 MB, 14 records
- `src/data/build/pricing-map.json` → derived_build, 0.53 MB, 3 records
- `src/data/build/pricing-paths.json` → derived_build, 0 MB, 3 records
- `src/data/build/pricing-stats.json` → derived_build, 0 MB
- `src/data/build/tag-map.json` → derived_build, 1.92 MB, 37 records
- `src/data/build/tag-paths.json` → derived_build, 0 MB, 37 records
- `src/data/build/tool-map.json` → derived_build, 23.81 MB, 19088 records
- `src/data/build/tool-page-data.json` → page_payload, 18.56 MB, 5000 records
- `src/data/build/tool-paths.json` → derived_build, 0.28 MB, 19088 records
- `src/data/build/tool-type-map.json` → derived_build, 1.44 MB, 23 records
- `src/data/build/tool-type-paths.json` → derived_build, 0 MB, 23 records
- `src/data/build/use-case-map.json` → derived_build, 0.02 MB, 6 records
- `src/data/build/use-case-paths.json` → derived_build, 0 MB, 6 records
- `src/data/build/prompt-library-map.json` → derived_build, 8.35 MB, 5553 records
- `src/data/build/prompt-library-paths.json` → derived_build, 0.08 MB, 5553 records
- `src/data/build/sitemap-data.json` → derived_build, 2.13 MB

## Best enrichment opportunities vs master

### data/raw/tools_source.json
- shared identities: 19466
- overlap vs other: 1
- desc: other 5000 vs master 4992
- e: other 5000 vs master 4992
- id: other 5000 vs master 4992
- platforms: other 5000 vs master 4992
- slug: other 4997 vs master 4992

### data/staging/normalized/tools_normalized.json
- shared identities: 19488
- overlap vs other: 1
- affiliate_priority_score: other 5000 vs master 4992
- ai_model: other 655 vs master 251
- best_for_queries: other 5000 vs master 4992
- brand_name_normalized: other 5000 vs master 4992
- canonical_domain: other 5000 vs master 4992
- canonical_handle: other 428 vs master 389
- canonical_url: other 5000 vs master 4992
- catSlug: other 5000 vs master 4992
- category_ambiguous: other 5000 vs master 4992
- category_confidence: other 5000 vs master 4992

### data/staging/enriched/tools_production.current.json
- shared identities: 19488
- overlap vs other: 1
- affiliate_priority_score: other 5000 vs master 4992
- ai_model: other 655 vs master 251
- best_for_queries: other 5000 vs master 4992
- brand_name_normalized: other 5000 vs master 4992
- canonical_domain: other 5000 vs master 4992
- canonical_handle: other 428 vs master 389
- canonical_url: other 5000 vs master 4992
- catSlug: other 5000 vs master 4992
- category_ambiguous: other 5000 vs master 4992
- category_confidence: other 5000 vs master 4992

### data/master/tools_master.seed.json
- shared identities: 19488
- overlap vs other: 1
- affiliate_priority_score: other 5000 vs master 4992
- ai_model: other 655 vs master 251
- best_for_queries: other 5000 vs master 4992
- brand_name_normalized: other 5000 vs master 4992
- canonical_domain: other 5000 vs master 4992
- canonical_handle: other 428 vs master 389
- canonical_url: other 5000 vs master 4992
- catSlug: other 5000 vs master 4992
- category_ambiguous: other 5000 vs master 4992
- category_confidence: other 5000 vs master 4992

### src/data/build/authority-tool-map.json
- shared identities: 22
- overlap vs other: 0.2222
- cat_slug: other 22 vs master 8
- category: other 95 vs master 0
- category_ranks: other 96 vs master 0
- display_name: other 99 vs master 0
- global_rank: other 99 vs master 0
- in_production: other 99 vs master 0
- is_global_top100: other 99 vs master 0
- logo_domain: other 99 vs master 8
- pricing_tier: other 99 vs master 8
- rank: other 99 vs master 0

### src/data/build/global-top100.json
- shared identities: 22
- overlap vs other: 0.2222
- cat_slug: other 23 vs master 8
- category: other 96 vs master 0
- display_name: other 100 vs master 0
- in_production: other 100 vs master 0
- logo_domain: other 100 vs master 8
- pricing_tier: other 100 vs master 8
- rank: other 100 vs master 0
- tagline: other 96 vs master 0
- website_url: other 96 vs master 0

### src/data/build/alternatives-page-data.json
- shared identities: 22
- overlap vs other: 0.0044
- alts: other 4978 vs master 0
- category: other 5000 vs master 0
- category_slug: other 5000 vs master 0
- description: other 5000 vs master 0
- logo_domain: other 5000 vs master 8
- pricing_tier: other 5000 vs master 8
- slug: other 5000 vs master 4992
- tagline: other 5000 vs master 0

### src/data/build/best-of-map.json
- shared identities: 0
- overlap vs other: 0
- count: other 95 vs master 0
- description: other 95 vs master 0
- tools: other 95 vs master 0

### src/data/build/best-of-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/compare-page-data.json
- shared identities: 0
- overlap vs other: 0
- toolA: other 3000 vs master 0
- toolB: other 3000 vs master 0

### src/data/build/compare-pairs.json
- shared identities: 0
- overlap vs other: 0
- a: other 5000 vs master 0
- b: other 5000 vs master 0
- slug: other 5000 vs master 4992

### src/data/build/category-map.json
- shared identities: 0
- overlap vs other: 0
- count: other 23 vs master 0
- description: other 23 vs master 0
- tools: other 23 vs master 0
- top_tools: other 23 vs master 0

### src/data/build/category-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/feature-map.json
- shared identities: 0
- overlap vs other: 0
- count: other 11 vs master 0
- tools: other 11 vs master 0

### src/data/build/feature-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/industry-map.json
- shared identities: 0
- overlap vs other: 0
- count: other 14 vs master 0
- description: other 14 vs master 0
- tools: other 14 vs master 0

### src/data/build/industry-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/pricing-map.json
- shared identities: 0
- overlap vs other: 0
- count: other 3 vs master 0
- description: other 3 vs master 0
- tools: other 3 vs master 0

### src/data/build/pricing-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/tag-map.json
- shared identities: 0
- overlap vs other: 0
- count: other 37 vs master 0
- description: other 37 vs master 0
- tools: other 37 vs master 0

### src/data/build/tag-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/tool-map.json
- shared identities: 22
- overlap vs other: 0.0012
- category: other 5000 vs master 0
- category_slug: other 5000 vs master 0
- commercial_score: other 5000 vs master 0
- compare_targets: other 5000 vs master 0
- complexity: other 5000 vs master 4992
- description: other 5000 vs master 0
- feature_tags: other 5000 vs master 0
- has_api: other 5000 vs master 0
- has_chrome_ext: other 5000 vs master 0
- has_mobile: other 5000 vs master 0

### src/data/build/tool-page-data.json
- shared identities: 22
- overlap vs other: 0.0044
- category: other 5000 vs master 0
- category_slug: other 5000 vs master 0
- commercial_score: other 5000 vs master 0
- compare_targets: other 4978 vs master 0
- compare_with: other 4978 vs master 0
- description: other 5000 vs master 0
- feature_tags: other 5000 vs master 0
- has_api: other 5000 vs master 0
- has_chrome_ext: other 5000 vs master 0
- has_mobile: other 5000 vs master 0

### src/data/build/tool-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/tool-type-map.json
- shared identities: 0
- overlap vs other: 0
- count: other 23 vs master 0
- tools: other 23 vs master 0

### src/data/build/tool-type-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/use-case-map.json
- shared identities: 0
- overlap vs other: 0
- count: other 6 vs master 0
- description: other 6 vs master 0
- tools: other 6 vs master 0

### src/data/build/use-case-paths.json
- shared identities: 0
- overlap vs other: 0

### src/data/build/prompt-library-map.json
- shared identities: 0
- overlap vs other: 0
- category: other 5000 vs master 0
- category_slug: other 5000 vs master 0
- commercial_score: other 5000 vs master 0
- compare_targets: other 5000 vs master 0
- complexity: other 5000 vs master 4992
- description: other 5000 vs master 0
- feature_tags: other 5000 vs master 0
- has_api: other 5000 vs master 0
- has_chrome_ext: other 5000 vs master 0
- has_mobile: other 5000 vs master 0

### src/data/build/prompt-library-paths.json
- shared identities: 0
- overlap vs other: 0
