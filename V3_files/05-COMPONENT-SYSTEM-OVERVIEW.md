# Component System Overview

## Goal
Allow design / UI / layout changes without rewriting data pipelines or page logic.

## Rules
1. No inline styles in pages or components
2. Components should have single responsibility
3. Shared components live in global component folders
4. Components should accept data props, not fetch logic
5. Business logic belongs in scripts or lib helpers, not in view components

## Component groups
- ui
- layout
- navigation
- cards
- sections
- tools
- insights
- seo
- legal

This lets you redesign the frontend while the build/data foundation stays stable.
