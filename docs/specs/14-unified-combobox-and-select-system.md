# Spec 14: Unified Custom Combobox & Select Styling Across Storefront and Admin

## Objective
Standardize every dropdown and select input across both the public storefront (`FilterBar.vue`) and the Admin Panel (`CatalogUploader.vue`) using the custom `BaseCombobox` / unified select design system, eliminating inconsistent native OS `<select>` elements.

## Requirements
1. **Enhance `BaseCombobox.vue` for Dual Use (Admin + Storefront):**
   - Support `allowCustom` prop (`Boolean`, default `true`): when `false` (storefront filters), restrict selection to provided options and include a clear/reset option (e.g., `"Todos los equipos"`, `"Todas las prendas"`).
   - Support `searchable` prop (`Boolean`, default `true`): when `false`, act as a sleek styled dropdown select (for fixed small lists like `Categoría` or `Ordenar por`) sharing the exact same border, padding, focus ring, and dropdown menu styling.
   - Ensure click-outside, `Escape` key closing, keyboard arrow navigation, and mobile touch targets (`min-h-[42px]`) work reliably.
2. **Replace Native `<select>` in Storefront `FilterBar.vue`:**
   - Replace the native team `<select>` with `BaseCombobox` (`allowCustom="false"`, searchable by typing team name).
   - Replace the garment `<select>` and sort `<select>` with the unified dropdown style (`BaseCombobox` with `allowCustom="false"`).
3. **Replace Native `<select>` in Admin `CatalogUploader.vue`:**
   - Replace the native category `<select>` (`Club`, `Selección`, `Marca`) with the unified non-searchable select style so all 5 fields in the filename builder share identical visual polish.
4. **Documentation Sync (`README.md`):**
   - Invoke the `create-readme` skill to update `README.md` reflecting the unified UI component system.

## Validation Criteria
- Zero raw browser `<select>` tags remain in `FilterBar.vue` or `CatalogUploader.vue`.
- In the public catalog, typing inside the Team filter dropdown filters available teams live and selects cleanly on both desktop and mobile.
- All dropdowns across storefront and Taller share identical theme-aware borders, backgrounds, and transitions.
- `npm test` and `npm run build` pass with zero errors, and `README.md` is updated.
