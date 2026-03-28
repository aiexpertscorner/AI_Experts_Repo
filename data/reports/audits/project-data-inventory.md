# Project Data Landscape Audit

Generated at: 2026-03-16T21:07:04.182Z

## Summary
- JSON files scanned: **47**
- Script files scanned: **11**

## JSON classification counts
- derived_build_dataset: **22**
- unclear_or_mixed: **12**
- enriched_or_master_candidate: **8**
- report_or_audit: **3**
- derived_search_index: **1**
- raw_source_candidate: **1**

## Recommendations
- **raw_source**: src/data/tools_source.json — Best raw/source candidate by classification and dataset shape.
- **enriched_master_candidate**: src/data/build/tools-master-mapped.json — Most likely enriched/master candidate based on field richness and classification.
- **normalized_layer**: Create explicit normalized dataset in data/staging/normalized — Current repo appears to jump from raw/source to production/build without a formal normalized layer.
- **page_payloads**: see json report — Search indexes and page payloads should not be source-of-truth.
- **build_outputs**: see json report — Treat maps/stats/page-data/index payloads as derived build outputs.
- **reports**: see json report — Keep all audits/debug/inspect outputs under reports, not as canonical data.
- **script_pipeline_groups**: see json report — Use these groups to reorganize scripts in clean-build-v3.

## Top JSON candidates
### src/data/build/compare-pairs.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 73216
- fields: 3
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/tools-master-mapped.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 19488
- fields: 94
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/tools-normalized.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 19488
- fields: 105
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/tools_production.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/staging/enriched`
- records: 19488
- fields: 75
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/tools_source.json
- kind: **raw_source_candidate**
- suggested V3 layer: `data/raw`
- records: 19466
- fields: 13
- reason: Filename/path suggests raw/source input dataset.

### src/data/build/tool-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 19088
- fields: 35
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tool-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 19088
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/tools_search_index.json
- kind: **derived_search_index**
- suggested V3 layer: `data/page-payloads/search`
- records: 19088
- fields: 10
- reason: Search/index naming plus record dataset shape.

### src/data/build/prompt-library-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 5553
- fields: 38
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/prompt-library-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 5553
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/alternatives-page-data.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 5000
- fields: 10
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/tool-page-data.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 5000
- fields: 37
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/compare-page-data.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 3000
- fields: 5
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/global-top100.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 100
- fields: 12
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/authority-tool-map.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 99
- fields: 15
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/best-of-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 95
- fields: 6
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/best-of-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 95
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tag-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 37
- fields: 6
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tag-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 37
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/category-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 23
- fields: 7
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/category-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 23
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tool-type-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 23
- fields: 4
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tool-type-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 23
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/industry-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 14
- fields: 5
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/industry-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 14
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/feature-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 11
- fields: 4
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/feature-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 11
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/use-case-map.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 6
- fields: 6
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/use-case-paths.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 6
- fields: 0
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/pricing-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 3
- fields: 6
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.
