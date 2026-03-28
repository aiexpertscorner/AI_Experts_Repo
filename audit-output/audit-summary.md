# pSEO Build Audit Report

Generated: 2026-03-25T23:23:21.935Z
Root: `E:\2026_Github\AI_Experts_V3_PROD\AI_Experts_Repo`

## 1. Executive Summary

- Overall score: **35.74/100**
- Routes detected: **51**
- Datasets detected: **19564**
- Internal links detected: **235**
- Orphan-risk routes: **39**
- Dead internal link targets: **131**

### Score Breakdown

- Route coverage: **100**
- Link health: **44.26**
- Orphan resistance: **23.53**
- Avg enrichment coverage across datasets: **1.39**
- Dataset usage ratio: **0.17**
- Code usage of enriched fields: **30.56**

## 2. Site Structure

### Page Families

| pageType | count |
| --- | --- |
| other | 10 |
| homepage | 5 |
| workflow | 4 |
| industry | 4 |
| comparison | 3 |
| tag | 3 |
| use-case | 3 |
| learn | 2 |
| alternatives | 2 |
| best-of | 2 |
| microcategory | 2 |
| subcategory | 2 |
| news | 1 |
| prompt | 1 |
| resource | 1 |
| submit | 1 |
| category | 1 |
| feature | 1 |
| pricing | 1 |
| tool-type | 1 |
| tool-detail | 1 |

### High-Intent Cluster Coverage

| family | count |
| --- | --- |
| toolDetail | 1 |
| comparison | 3 |
| alternatives | 2 |
| bestOf | 2 |
| useCase | 3 |
| workflow | 4 |
| category | 1 |
| feature | 1 |
| industry | 4 |
| pricing | 1 |
| tag | 3 |
| toolType | 1 |



## 3. Dataset Inventory

| file | role | records | usedByCount | enrichmentCoveragePct |
| --- | --- | --- | --- | --- |
| src/data/build/page-manifest.json | unknown | 24806 | 0 | 1.39% |
| src/data/build/logo-map.json | unknown | 19487 | 25 | 0% |
| src/data/build/tool-slugs.json | unknown | 19487 | 1 | 0% |
| src/data/build/compare-map.json | unknown | 19088 | 0 | 0% |
| src/data/build/tool-paths.json | path-list | 19088 | 0 | 0% |
| src/data/build/prompt-library-paths.json | path-list | 5553 | 0 | 0% |
| src/data/build/compare-pairs.json | unknown | 3053 | 2 | 1.39% |
| src/data/build/page-payloads/compare-pages.json | unknown | 3053 | 0 | 1.39% |
| src/data/build/compare-page-data.json | compare-page-data | 3000 | 0 | 4.17% |
| src/data/build/page-payloads/best-cluster-pages.json | unknown | 562 | 2 | 1.39% |
| src/data/build/page-payloads/alternatives-pages.json | alternatives-page-data | 538 | 3 | 1.39% |
| src/data/build/page-payloads/best-pages.json | unknown | 518 | 3 | 1.39% |
| src/data/build/page-payloads/microcategory-pages.json | microcategory-map | 240 | 3 | 1.39% |
| src/data/build/authority-tool-map.json | authority-map | 99 | 0 | 9.72% |
| src/data/build/best-of-map.json | unknown | 95 | 0 | 4.17% |

## 4. Orphan Risk Routes

| route |
| --- |
| /ai-model |
| /ai-model/[slug] |
| /ai-news |
| /ai-workflows |
| /alle index/alternatiives-index |
| /alle index/best-index |
| /alle index/capability-index |
| /alle index/compare-index |
| /alle index/industry-index |
| /alle index/learn-ai-index |
| /alle index/microcategory-index |
| /alle index/subcategory-index |
| /alle index/tag-index |
| /alle index/use-case-index |
| /alle index/workflow-index |
| /alternatives/[slug] |
| /best/[slug] |
| /capability/[slug] |
| /compare/[slug] |
| /industry/[slug] |

## 5. Dead Internal Links

| from | to |
| --- | --- |
| /ai-model | /ai-model/${slug |
| /ai-model/[slug] | /ai-tools |
| /alle index/alternatiives-index | /alternatives/${seed.slug |
| /alle index/alternatiives-index | /alternatives-pages.json |
| /alle index/best-index | /best-pages.json |
| /alle index/best-index | /best-cluster-pages.json |
| /alle index/best-index | /best/ai- |
| /alle index/capability-index | /capability/${slug |
| /alle index/compare-index | /compare-pairs.json |
| /alle index/compare-index | /compare/${[slugA, |
| /alle index/industry-index | /industry/${slug |
| /alle index/industry-index | /industry-pages.json |
| /alle index/microcategory-index | /microcategory/${slug |
| /alle index/subcategory-index | /subcategory/${slug |
| /alle index/tag-index | /tag/${slug |
| /alle index/tag-index | /tag-pages.json |
| /alle index/use-case-index | /use-case/index.astro |
| /alle index/use-case-index | /use-case/ |
| /alle index/use-case-index | /use-case-cluster-pages.json |
| /alle index/use-case-index | /use-case/${slug |

## 6. Enrichment vs Actual Usage

The auditor compares high-value enrichment fields with code usage. Fields can exist in datasets but still be underused in cards/pages.

Top code-used fields:

| field | count |
| --- | --- |
| astro | 63 |
| json | 45 |
| props | 40 |
| slug | 39 |
| name | 28 |
| style | 26 |
| top_tools | 21 |
| css | 19 |
| seo | 19 |
| params | 17 |
| logo_url | 16 |
| clearbit | 16 |
| count | 15 |
| logo_domain | 15 |
| description | 14 |
| title | 14 |
| primary | 12 |
| route | 12 |
| meta | 11 |
| href | 10 |

## 7. Concrete Advice

| priority | area | message |
| --- | --- | --- |
| high | dataset-usage | There are 19531 JSON datasets not referenced by pages/components. Either wire them into templates or remove/merge them to reduce maintenance overhead. |
| high | internal-linking | 39 routes have zero detected internal in-links. Add hub → subhub → detail links, breadcrumbs, related blocks, and footer lattice links. |
| high | link-health | 131 internal links point to targets not found in src/pages route inventory. Check renamed routes, legacy paths, and page-family prefixes. |
| medium | enrichment-utilization | Several enriched fields exist in datasets but appear unused in templates: seo_title, seo_description. Surface them in cards, detail pages, comparison blocks, schema, filters, and internal-link modules. |
| medium | dataset-pipeline | Known build datasets with zero detected usage: alternatives-page-data (src/data/build/alternatives-map.json); alternatives-page-data (src/data/build/alternatives-page-data.json); authority-map (src/data/build/authority-tool-map.json); path-list (src/data/build/best-of-paths.json); authority-map (src/data/build/category-top10.json); path-list (src/data/build/company-paths.json); compare-page-data (src/data/build/compare-page-data.json); authority-map (src/data/build/global-top100.json). Verify import paths and whether the live build is still using legacy structures instead of the new dataset layer. |
| high | architecture | Target a strict lattice: homepage → main hubs → subhubs → page families → detail pages, plus reverse links (breadcrumbs, related, same-cluster, same-use-case, same-workflow, same-pricing, same-industry). |
| high | content-strategy | For each tool detail page, expose at least: alternatives, comparisons, best-for use cases, pricing bucket, feature cluster, industry relevance, related workflows, and 3–8 contextual internal links generated from dataset relationships. |
| medium | build-pipeline | Split pipeline into: enrich → normalize → authority → cluster-map → page-data → audit → build. The audit should fail CI when key datasets are missing, route families drop unexpectedly, or orphan/dead-link thresholds are exceeded. |

## 8. Practical Next Moves

1. Wire every strategic dataset into a visible page family or remove it.
2. Enforce homepage → hub → subhub → cluster → detail linking.
3. Generate context modules from datasets: related tools, comparisons, alternatives, workflows, pricing neighbors, feature neighbors.
4. Surface more enrichment in templates and schema.
5. Add CI thresholds for orphan risk, dead links, missing datasets, and unexpected page-family drops.
