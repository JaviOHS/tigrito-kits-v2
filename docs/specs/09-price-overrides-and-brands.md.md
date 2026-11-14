# Spec 09: Declarative Price Overrides, Discount UI & Brand Category (`MARCA`)

## Objective
1. Support a flat `overrides` array in `store.json` with strikethrough discount UI on matching kits.
2. Add `MARCA` (Brand) as a first-class category alongside `CLUB` and `SEL` for non-team sportswear (e.g., Nike/Adidas windbreakers or tracksuits).

## Requirements
1. **Declarative Price Overrides (`resolveKitPrice`):**
   - Resolve `standardPrice = store.prices?.[kit.garment] ?? store.defaultPrice ?? store.basePrice`.
   - Evaluate optional `store.overrides` array (matching optional `filename`, `team`, and/or `garment` case-insensitively).
   - Return `{ currentPrice, originalPrice, hasDiscount }` where `hasDiscount` is `true` only when an override applies and `currentPrice < originalPrice`.
2. **Discount Visual Indicator (`KitBoxCard.vue`, `TopPicksCarousel.vue`, `KitDetailModal.vue`):**
   - When `hasDiscount` is `true`, render `currentPrice` highlighted with `--accent-primary` next to muted strikethrough `originalPrice` (`line-through`).
   - Non-matching items (such as `IMPERMEABLE` or `CONJUNTO` when override specifies `CAMISETA`) display only their regular single price.
   - Ensure WhatsApp order messages use `currentPrice`.
3. **Brand Category (`MARCA`) Support:**
   - Update `catalogParser.js` and `filenameBuilder.js` to recognize `MARCA` (`categoryLabel: 'Marca'`).
   - Add `MARCA` ("Marcas") pill to `src/config/filters.config.js` alongside `Todos`, `Clubes`, and `Selecciones` (ensure horizontal scroll/wrap on narrow mobile screens).
   - Add `"Marca"` option in `CatalogUploader.vue` category selector and adapt the team/brand input label dynamically.

## Validation Criteria
- `SEL_ECUADOR_2026_LOCAL_CAMISETA.webp` shows `$20.00` (`$22.50` strikethrough) while `SEL_ECUADOR_2025_EDICION-1_IMPERMEABLE.webp` and `CONJUNTO` items keep their standard prices.
- `MARCA_NIKE_2026_NEGRO_IMPERMEABLE.webp` parses under category `MARCA`, appears under the "Marcas" filter pill, and resolves `IMPERMEABLE` pricing cleanly.
- Unit tests and `npm run build` pass cleanly.
