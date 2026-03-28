# Data Layer Audit

Generated at: 2026-03-16T20:38:09.006Z

## Recommended V3 layer mapping

- **raw** → `src/data/tools_source.json` (Contains broad base tool fields without strong enrichment-layer signals.)
- **enriched_master** → `src/data/tools_production.json` (Likely canonical production dataset, but audit should confirm separation from derived outputs.)
- **normalized** → `TO_BE_CREATED` (Normalized layer should exist explicitly in V3 even if current repo skips this as a standalone artifact.)
- **page_payloads** → `TO_BE_REGENERATED` (Page payloads should be generated from enriched master + derived maps, not treated as source datasets.)

## Dataset summaries

### tools_source
- Path: `src/data/tools_source.json`
- Exists: true
- Records: **19466**
- Top-level type: `array`
- Classification: **raw_source_candidate** (high)
- Reason: Contains broad base tool fields without strong enrichment-layer signals.
- Completeness avg: **0.7857**
- Total distinct fields: **13**

Top fields:
- `cat` present=19466 (1) empty=0 (0)
- `desc` present=19466 (1) empty=0 (0)
- `e` present=19466 (1) empty=0 (0)
- `handle` present=19466 (1) empty=0 (0)
- `highlights` present=19466 (1) empty=15289 (0.7854)
- `id` present=19466 (1) empty=0 (0)
- `name` present=19466 (1) empty=0 (0)
- `platforms` present=19466 (1) empty=0 (0)
- `pricing` present=19466 (1) empty=0 (0)
- `short` present=19466 (1) empty=0 (0)
- `slug` present=19466 (1) empty=8 (0.0004)
- `tags` present=19466 (1) empty=0 (0)
- `url` present=19466 (1) empty=0 (0)

### tools_production
- Path: `src/data/tools_production.json`
- Exists: true
- Records: **19488**
- Top-level type: `array`
- Classification: **enriched_master_candidate** (medium)
- Reason: Likely canonical production dataset, but audit should confirm separation from derived outputs.
- Completeness avg: **0.7854**
- Total distinct fields: **78**

Top fields:
- `cat` present=19488 (1) empty=0 (0)
- `display_score` present=19488 (1) empty=0 (0)
- `handle` present=19488 (1) empty=0 (0)
- `homepage_priority_score` present=19488 (1) empty=0 (0)
- `is_canonical` present=19488 (1) empty=0 (0)
- `name` present=19488 (1) empty=0 (0)
- `name_clean` present=19488 (1) empty=0 (0)
- `pricing` present=19488 (1) empty=0 (0)
- `seo_title` present=19488 (1) empty=0 (0)
- `short` present=19488 (1) empty=0 (0)
- `tags` present=19488 (1) empty=0 (0)
- `url` present=19488 (1) empty=0 (0)
- `affiliate_networks` present=19466 (0.9989) empty=19466 (0.9989)
- `affiliate_priority_score` present=19466 (0.9989) empty=0 (0)
- `ai_model` present=19466 (0.9989) empty=18626 (0.9558)
- `best_for_queries` present=19466 (0.9989) empty=0 (0)
- `brand_name_normalized` present=19466 (0.9989) empty=1 (0.0001)
- `canonical_domain` present=19466 (0.9989) empty=0 (0)
- `canonical_handle` present=19466 (0.9989) empty=17991 (0.9232)
- `canonical_url` present=19466 (0.9989) empty=0 (0)

### tools_search_index
- Path: `src/data/build/tools_search_index.json`
- Exists: false

## Dataset overlap

- **tools_source__vs__tools_production**: shared=19466, left-only=0, right-only=22
