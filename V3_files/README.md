# AIExpertsCorner — Master Site Architecture End-State Blueprint

This pack is the master blueprint for the long-term architecture of AIExpertsCorner.

It is designed for:
- scalable programmatic SEO
- enriched data pipelines
- clean component/layout/style separation
- stable build pipelines
- internal linking automation
- future Insights / tutorials / trend engines
- affiliate-ready trust and monetization layers

This is the intended end-state architecture:
- what folders exist
- what files should exist
- what each part is responsible for
- how the build flows from raw data to live pages

## Architecture principles

1. Enrichment is separate from rendering
2. Page datasets are separate from master enriched data
3. Internal linking is data-driven, not hand-coded
4. Astro pages should consume datasets and render components
5. Components, layouts, and styles are modular
6. New pages/templates should be addable without refactoring old ones
7. Full and incremental pipelines should both be supported
