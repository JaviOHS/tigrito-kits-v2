# Spec 03: Declarative Filter Engine & Batch Pagination Composable

## Objective
Create an extensible, configuration-driven filtering engine and a reactive catalog composable with batch pagination (`BATCH_SIZE = 12`).

## Requirements
1. **`src/config/filters.config.js`:** Define declarative filter rules:
   - `category`: pills (`ALL`, `CLUB`, `SEL`)
   - `retroOnly`: boolean toggle (`isRetro === true`)
   - `team`: dynamic dropdown (`ALL` + auto-extracted sorted unique teams from loaded catalog)
   - `search`: optional text query matching `team` or `season`
2. **`src/core/filterEngine.js`:** Pure function `applyCatalogFilters(items, filterState, filterConfig)` that evaluates active rules dynamically.
3. **`src/composables/useCatalog.js`:**
   - Loads catalog + configs via `supabaseStorageAdapter`.
   - Computes `availableTeams` dynamically from `allKits`.
   - Computes `filteredKits` over 100% of items in memory.
   - Exposes `visibleKits` sliced by `visibleLimit` (starts at `12`, increments by `12` via `loadMore()`).
   - Resets `visibleLimit` to `12` whenever any filter changes.
   - Resolves `topPickKits` based on `top-picks.json` (`teams` array and/or `specificFiles` array).

## Validation Criteria
- Changing any filter resets pagination to 12 items.
- Adding a new team in mock data automatically populates `availableTeams` without code edits.
