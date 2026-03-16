# Implementation notes

## Best strategy for AIExpertsCorner

Yes: **make enrichment fully separate from the build**.

That is the most professional setup.

## Recommended layers

1. `tools_production.json` = source of truth input
2. `tools.normalized.json` = stable normalized layer
3. `tools.taxonomy.json` = assigned to taxonomy
4. `tools.enriched.json` = final build input snapshot
5. graph + manifest + payloads = deterministic build outputs

## Why separate enrichment from build

Because these are different responsibilities:

### Enrichment
- data shaping
- taxonomy matching
- scoring
- confidence assignment
- review queues
- field derivation
- expensive logic

### Build
- read already-enriched snapshot
- generate page manifest
- generate page payloads
- render Astro pages

## Best workflow

### Normal day-to-day work
1. import new or updated tools
2. run `npm run enrich:incremental`
3. inspect review queue
4. run `npm run build:fast`

### Release workflow
1. run `npm run enrich:full`
2. inspect validation + review outputs
3. run `npm run pipeline:release`
4. deploy

## Optional next upgrades

Recommended future upgrades:
- fingerprint based article payload cache
- affiliate-partner enrichment layer
- trending detector from search/trend input feeds
- indexation gating by page family thresholds
- sitemap slicing by phase / template family
- page quality scoring before publish
- auto noindex for weak entity pages
- content brief generation layer per entity
