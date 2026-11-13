# Spec 04: Tactile KitBox UI, Header, Top Picks & Filter Bar

## Objective
Implement the main storefront interface using the `frontend-design` skill with tactile editorial/paper aesthetics and responsive KitBox cards.

## Requirements
1. **`AppHeader.vue` (`sticky`, subtle glass backdrop):**
   - Brand avatar (`logo.webp` circular) + title "Tigrito KitLab" (from `store.json`).
   - Action icons: Theme toggle (Sun/Moon), Notifications bell (with active indicator dot if `notifications.json` has active items), Info button, and direct WhatsApp CTA button.
2. **`TopPicksCarousel.vue`:**
   - Horizontal snap-scroll strip highlighting `topPickKits` with subtle `--accent-primary` border accent and "TOP" badge.
3. **`FilterBar.vue`:**
   - Tactile category pills (`Todos`, `Clubes`, `Selecciones`), `Solo Retro` switch, dynamic team `<select>`, compact search input, and counter (*"Mostrando X de Y kits"*).
4. **`KitBoxCard.vue`:**
   - Tactile card (`--bg-surface`, `1px solid var(--border-subtle)`, `rounded-xl`).
   - Image container: `aspect-[4/5]` with subtle neutral radial background and `object-contain p-3` + `loading="lazy"` so horizontal and vertical photos look uniform without cropping.
   - Corner badges: Season (`2026` or `RETRO`) and Garment badge if `garment !== 'CAMISETA'` (`BUZO`, `CONJUNTO`, etc.).
   - Footer spec sheet: Team name, variant subtitle, formatted price (from `store.json`), and "Pedir" WhatsApp button generating pre-filled `https://wa.me/...` URL.
5. **Responsive Grid (`App.vue`):** 2 columns on mobile, 3 on tablet, 4 on desktop, plus centered "Cargar más kits" button when `visibleKits.length < filteredKits.length`.

## Validation Criteria
- Responsive layout verified at 375px, 768px, and 1280px viewports.
- Both `paper-light` and `slate-dark` themes render with high readability and zero hardcoded hex colors in components.
