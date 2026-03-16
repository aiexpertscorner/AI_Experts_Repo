# AIExpertsCorner JSON Blueprint Scripts

This pack contains Node `.mjs` scripts to validate, score, and derive datasets from your `top100_tools_schema.json` using the JSON blueprint files.

## Included scripts

- `scripts/00-shared.mjs` — shared loaders, scoring helpers, validation helpers
- `scripts/01-validate-top100.mjs` — validates tools against `field_definitions.json`, `allowed_values.json`, and enrichment rules
- `scripts/02-enrichment-priority-report.mjs` — creates completeness, priority, and rollout reports
- `scripts/03-build-derived-datasets.mjs` — builds taxonomy, related tools, compare, alternatives, and best-of datasets
- `scripts/04-build-page-payloads.mjs` — builds lightweight page payloads for Astro
- `scripts/99-run-all.mjs` — runs all scripts in order

## Expected input files

Default paths:

- `../aiexpertscorner_top100_tools_schema.json`
- `../aiexpertscorner_json_blueprint/field_definitions.json`
- `../aiexpertscorner_json_blueprint/allowed_values.json`
- `../aiexpertscorner_json_blueprint/enrichment_rules.json`
- `../aiexpertscorner_json_blueprint/scoring_formulas.json`
- `../aiexpertscorner_json_blueprint/page_blueprints.json`
- `../aiexpertscorner_json_blueprint/schema_extensions.json`

## Output folder

By default, outputs are written to:

- `./output/validation/*`
- `./output/reports/*`
- `./output/build/*`
- `./output/page-payloads/*`

## Usage

From the folder containing this README:

```bash
node scripts/99-run-all.mjs
```

Run a single script:

```bash
node scripts/01-validate-top100.mjs
node scripts/02-enrichment-priority-report.mjs
node scripts/03-build-derived-datasets.mjs
node scripts/04-build-page-payloads.mjs
```

## Notes

- These scripts are intentionally conservative and deterministic.
- They do not overwrite your source data.
- Scoring is based on the formulas in `scoring_formulas.json` when possible, with safe fallbacks.
- Allowed values checks are strict for enums and soft for free-text arrays.
