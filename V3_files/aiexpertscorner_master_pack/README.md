# AIExpertsCorner Master Build + Enrichment Pack

This pack is designed for a registry-first, graph-driven, rules-based Astro build.

## Recommended production strategy

Keep **enrichment separate from build**.

### 1. Full enrichment job
Run only when:
- top100/master tool schema changed materially
- new source data imported
- taxonomy aliases/overrides changed heavily
- scoring formulas changed
- new page families added

Command:

```bash
npm run enrich:full
```

This writes fresh snapshots to:
- `src/data/derived/tools.normalized.json`
- `src/data/derived/tools.taxonomy.json`
- `src/data/derived/tools.enriched.json`
- `src/data/derived/review/*.json`
- `src/data/derived/graphs/*.json`
- `src/data/build/page-manifest.json`

### 2. Incremental enrichment job
Run when:
- a small subset of tools changed
- latest tool dump imported
- manual overrides changed for a few tools
- you only want to update changed tools, not rebuild the whole enrichment layer

Command:

```bash
npm run enrich:incremental
```

This uses fingerprints from `src/data/derived/cache/tool-fingerprints.json` and only reprocesses changed tools.

### 3. Fast build job
Run for normal local and CI builds.

Command:

```bash
npm run build:fast
```

This assumes the latest enriched artifacts already exist and only regenerates:
- graph layer
- page manifest
- page payloads
- Astro build

### 4. Launch / release build
Use before publishing a new major build.

```bash
npm run pipeline:release
```

This does:
1. normalize
2. taxonomy registry
3. taxonomy assignment
4. enrichment
5. validation
6. graphs
7. manifest
8. payloads
9. Astro build

## Why this is the professional setup

Because enrichment is computational + logic heavy, while build should stay deterministic and fast.

That gives you:
- faster CI
- reproducible live builds
- easier rollback to previous enriched snapshot
- less duplicated work
- cleaner audit / review workflow
- ability to enrich daily or weekly, but build many times per day

## Suggested schedule

- `enrich:incremental`: daily or on import
- `enrich:full`: weekly or after schema/taxonomy changes
- `build:fast`: every normal deployment
- `pipeline:release`: before pushing a new major live build

## Expected inputs

- `src/data/tools_production.json`
- `data/imports/aiexpertscorner_taxonomy_master_blueprint-1.csv`
- `data/imports/aiexpertscorner_page_generation_rules.csv`
- `src/config/taxonomy/entity-aliases.json`
- `src/config/taxonomy/manual-overrides.json`

## Generated outputs

- `src/data/derived/taxonomy/*.json`
- `src/data/derived/review/*.json`
- `src/data/derived/cache/*.json`
- `src/data/derived/graphs/*.json`
- `src/data/derived/tools.*.json`
- `src/data/build/page-manifest.json`
- `src/data/build/page-payloads/*.json`

