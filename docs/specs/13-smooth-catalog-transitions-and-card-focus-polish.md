# Spec 13: Smooth Catalog Filter Transitions & Refined Card Border States

## Objective
Add lightweight pure-CSS `<TransitionGroup>` animations when filtering or sorting catalog items, and refine hover/focus borders on kit cards so selection states look clean and never leave sticky orange outlines on click/tap.

## Requirements
1. **Pure-CSS Filter & Sort Transitions (`CatalogGrid.vue` / `src/styles/transitions.css`):**
   - Wrap catalog kit cards in Vue's native `<TransitionGroup name="kit-grid" tag="div">` preserving the existing responsive CSS grid layout.
   - Implement subtle, GPU-accelerated pure-CSS transitions (`opacity` + `translateY(6px)` over `200ms ease-out` for enter/leave, and `transform 240ms ease` for `.kit-grid-move`).
   - Disable animations when `@media (prefers-reduced-motion: reduce)` is active.
   - Do not add external animation libraries (no AOS).
2. **Refined Card Hover & Focus Borders (`KitBoxCard.vue` & `TopPicksCarousel.vue`):**
   - Replace persistent `:focus` orange outline/ring on card click/tap with `:focus-visible` (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/60`) so mouse clicks and mobile taps do not leave a sticky bright border.
   - Refine `:hover` border transition to use a subtle border color shift (`hover:border-[var(--border-strong)]` or soft warm tint) with a gentle `transition-all duration-200` instead of an overly bright accent border.
3. **Documentation Sync (`README.md`):**
   - Invoke the `create-readme` skill to update `README.md` with the latest UI polish and current project state.

## Validation Criteria
- Switching filters (`Todos`, `Clubes`, `Selecciones`, `Marcas`, garment filter, or search) animates cards smoothly without layout jumps.
- Clicking or tapping a kit card opens the detail modal without leaving a harsh orange border stuck on the card afterward, while keyboard Tab navigation retains accessible `:focus-visible` outlines.
- `npm run build` passes cleanly and `README.md` is up to date.
