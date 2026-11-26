# Spec 12: Smart Catalog Sorting, Garment Filters & README Sync

## Objective
Replace raw alphabetical filename sorting in the storefront catalog with a commercial-first hybrid sorting hierarchy (`store.json` priority teams + season recency + garment/variant order), add a dynamic garment filter and sort selector, and update `README.md` using the `create-readme` skill.

## Requirements
1. **Domain Sorting Engine (`src/core/domain/catalogSorter.js`):**
   - Implement `sortCatalogKits(kits, options)` with pure, deterministic logic:
     - **Mode `'recommended'` (Default):**
       1. Season recency descending: numeric years descending (`2026` before `2025` before `2017`), with non-numeric/retro labels (`RETRO`) ordered after current seasons (unless filtered).
       2. Priority teams from `storeConfig.priorityTeams` (optional case-insensitive string array in `store.json`): kits matching earlier entries in `priorityTeams` rank first; unlisted teams follow alphabetically.
       3. Garment hierarchy: `CAMISETA` > `CONJUNTO` > `BUZO` > `IMPERMEABLE` > `PANTALONETA` > `JOGGER` > remaining garments alphabetically.
       4. Variant hierarchy: `LOCAL` > `VISITANTE` > `ALTERNA` > `EXCLUSIVA` > remaining variants alphabetically.
     - **Mode `'newest'`:** Strictly season recency descending, then team alphabetically, then garment/variant hierarchy.
     - **Mode `'price-asc'`:** Resolved `currentPrice` ascending, then season recency descending.
2. **Dynamic Garment Filter & Sort UI (`FilterBar.vue` / `useCatalogFilters.js`):**
   - Add a dynamic garment filter selector (`Todas las prendas`, `Camisetas`, `Impermeables`, `Buzos`, `Pantalonetas`, `Joggers`, etc.) derived dynamically from the garments present in the loaded catalog (zero hardcoded lists).
   - Add a compact sort selector (`Ordenar: Recomendados | Más recientes | Menor precio`) cleanly aligned with the mobile and desktop filter bar.
   - Ensure "Limpiar filtros" resets category, team, garment, retro toggle, search query, and sort mode cleanly.
3. **Store Configuration Support (`store.json`):**
   - Support optional `priorityTeams: string[]` in `store.json` safely with fallback to `[]` if omitted.
4. **Unit Tests & `README.md` Update:**
   - Add unit tests for `sortCatalogKits` covering `priorityTeams`, season descending order, garment/variant priority, and `price-asc` sorting.
   - Use the `create-readme` skill to update `README.md` reflecting the current architecture, admin panel capabilities, JSON schemas (`overrides`, `priorityTeams`), and latest version state.

## Validation Criteria
- Opening the catalog displays `2026` kits and configured `priorityTeams` before older seasons or alphabetical-only items.
- Filtering by a team (e.g., Real Madrid) shows `2026` jerseys before older retro kits, and groups shirts ahead of shorts/joggers.
- Filtering by garment (e.g., `Impermeable` or `Jogger`) works dynamically with zero hardcoded garment lists.
- Unit tests, `npm run build`, and `README.md` updates pass cleanly.
