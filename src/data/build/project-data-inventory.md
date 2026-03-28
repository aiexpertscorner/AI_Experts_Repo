# Project Data Landscape Audit

Generated at: 2026-03-27T23:53:01.831Z

## Summary
- JSON files scanned: **19578**
- Script files scanned: **17**

## JSON classification counts
- unclear_or_mixed: **19461**
- derived_build_dataset: **52**
- report_or_audit: **46**
- enriched_or_master_candidate: **14**
- blueprint_or_contract: **3**
- schema_or_contract: **1**
- raw_source_candidate: **1**

## Recommendations
- **raw_source**: src/data/tools_source.json — Best raw/source candidate by classification and dataset shape.
- **enriched_master_candidate**: src/data/build/authority-tool-map.json — Most likely enriched/master candidate based on field richness and classification.
- **normalized_layer**: Create explicit normalized dataset in data/staging/normalized — Current repo appears to jump from raw/source to production/build without a formal normalized layer.
- **page_payloads**: Regenerate payloads from enriched master and derived datasets — Search indexes and page payloads should not be source-of-truth.
- **build_outputs**: see json report — Treat maps/stats/page-data/index payloads as derived build outputs.
- **reports**: see json report — Keep all audits/debug/inspect outputs under reports, not as canonical data.
- **script_pipeline_groups**: see json report — Use these groups to reorganize scripts in clean-build-v3.

## Top JSON candidates
### src/data/build/page-manifest.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 24806
- fields: 6
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/page-payloads/tool-pages-rich.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 19487
- fields: 11
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/page-payloads/tool-pages.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 19487
- fields: 11
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tool-map.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 19487
- fields: 13
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tool-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 19487
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tool-slugs.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 19486
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/tools_source.json
- kind: **raw_source_candidate**
- suggested V3 layer: `data/raw`
- records: 19466
- fields: 13
- reason: Filename/path suggests raw/source input dataset.

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

### src/data/build/logos-ok.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 5000
- fields: 23
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/logos.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 5000
- fields: 23
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/tool-page-data.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 5000
- fields: 37
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/compare-pairs.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 3053
- fields: 5
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/compare-paths.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 3053
- fields: 0
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/page-payloads/compare-pages-rich.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 3053
- fields: 8
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/page-payloads/compare-pages.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 3053
- fields: 6
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/compare-page-data.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 3000
- fields: 5
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/best-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 1080
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/page-payloads/best-cluster-pages.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 562
- fields: 9
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/alt-paths.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 538
- fields: 0
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/page-payloads/alternatives-pages.json
- kind: **enriched_or_master_candidate**
- suggested V3 layer: `data/master_or_staging_review`
- records: 538
- fields: 6
- reason: Filename/path suggests enriched, canonical, taxonomy, authority, or master data.

### src/data/build/page-payloads/best-pages.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 518
- fields: 6
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/page-payloads/microcategory-pages.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 240
- fields: 7
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

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

### src/data/build/page-payloads/tag-pages.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 93
- fields: 7
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.

### src/data/build/page-payloads/subcategory-pages.json
- kind: **derived_build_dataset**
- suggested V3 layer: `data/build`
- records: 80
- fields: 7
- reason: Filename/path suggests generated build data, maps, payloads, stats, or index.
