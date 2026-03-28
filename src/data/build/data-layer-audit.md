# Data Layer Audit

Generated at: 2026-03-25T23:25:45.829Z

## Recommended V3 layer mapping

- **raw** → `src/data/tools_source.json` (Contains broad base tool fields without strong enrichment-layer signals.)
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
- Exists: false

### tools_search_index
- Path: `src/data/build/tools_search_index.json`
- Exists: false

## Dataset overlap

