# Spec 11: Dynamic Store-Driven Combos & Available Icons Reference

## Objective
Eliminate hardcoded garment lists and unreliable native mobile `<datalist>` dropdowns in the Admin Panel by driving options dynamically from `store.json` (`prices`) and live catalog items, and expose available icons from `icons.registry.js` in the JSON editor.

## Requirements
1. **Dynamic Garment Options (`CatalogUploader.vue`):**
   - Derive available garment options dynamically from `Object.keys(storeConfig.prices || {})` merged with unique `garment` codes present in the live catalog (formatted with human-readable labels, while still allowing custom free-text garment entry).
   - Remove hardcoded garment arrays from UI components.
2. **Mobile-Friendly Custom Combobox for `Equipo` and `Variante` (`CatalogUploader.vue`):**
   - Replace native `<datalist>` inputs with a reusable lightweight combobox component (`BaseCombobox.vue`) that opens a scrollable suggestion list on focus/tap (showing unique teams or variants from the live catalog, filtered as the user types, while accepting any new custom value).
   - Prevent filename preview overflow (`break-all` or clean horizontal fit on narrow mobile screens).
3. **Available Icons Helper in `JsonConfigEditor.vue`:**
   - Export the list of registered icon names from `src/config/icons.registry.js` (`AVAILABLE_ICON_NAMES`).
   - Render a collapsible/compact "Iconos disponibles" bar in `JsonConfigEditor.vue` (especially visible when editing `notifications.json` or `store.json`) displaying each icon visually alongside its exact name; tapping/clicking an icon copies its name to the clipboard with a brief confirmation badge.
   - Fix mobile tab header spacing (`Tienda`, `Novedades`, `Destacados`) so tab labels never clip on small screens.

## Validation Criteria
- Adding a new garment key in `store.json` (e.g., `"SUDADERA": 35`) immediately makes it selectable in the Catalog garment selector without code edits.
- Tapping `Equipo` or `Variante` on mobile Brave/Chrome displays existing catalog suggestions reliably.
- Clicking any icon chip in `JsonConfigEditor.vue` copies its exact registered name.
- `npm run build` passes with zero errors.
