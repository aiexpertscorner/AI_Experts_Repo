# Master Architecture Overview

The site is built in 4 major layers.

## 1. Source / Raw Data Layer
Contains:
- raw tools dataset
- partner / affiliate inputs
- audit reports
- insights source data
- manual overrides

This layer should not contain rendering concerns.

## 2. Enrichment Layer
Transforms raw inputs into enriched, normalized, taxonomy-aware master data.

Examples:
- category normalization
- pricing normalization
- use case mapping
- audience mapping
- trend flags
- commercial flags
- page eligibility
- internal link seeds

## 3. Build Dataset Layer
Builds page-specific datasets from enriched master data.

Examples:
- homepage-data.json
- tools-hub-data.json
- tool-page-data.json
- category-page-data.json
- compare-page-data.json
- best-page-data.json
- alternatives-page-data.json
- navigation-data.json
- seo-meta-map.json
- internal-link-map.json

## 4. Rendering Layer
Astro pages + components + layouts + styles render the build datasets.

This layer should stay as “dumb” as possible:
- no heavy taxonomy logic
- no major entity inference
- no enrichment logic
- no dynamic relationship building
