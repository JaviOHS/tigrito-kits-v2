# AGENTS.md — Tigrito KitLab v2

## 1. Project Overview & Scope
**Tigrito KitLab** is a modern, serverless, zero-database sports jersey catalog built with **Vue 3 (Composition API)**, **Vite**, and **Tailwind CSS**.
All catalog data and assets are fetched directly from a public **Supabase Storage** bucket (`tigrito-assets`) using structured filenames and static JSON configuration files (`store.json`, `notifications.json`, `top-picks.json`).

## 2. Mandatory Tooling & Skills Protocol
- **Documentation Lookup (`context7`):** ALWAYS query Context7 before writing setup code or using APIs for `vue` (v3.5+), `vite`, `tailwindcss` (v4 or v3), `@supabase/supabase-js` (or REST storage endpoints), and `lucide-vue-next` to ensure up-to-date syntax without deprecated patterns.
- **Design & Architecture Skills:** Apply `frontend-design` (tactile editorial/paper minimalism, clean visual hierarchy, accessible contrast, responsive grids) and `clean-architecture` (strict separation between domain logic in `src/core/`, declarative configs in `src/config/`, and presentation in `src/components/`).
- **Workflow Mode:** Follow **Spec-Driven Development (SDD)**. Execute ONLY one specification file from `docs/specs/` per turn. Never skip ahead. Validate build (`npm run build`), types/linting, and acceptance criteria before marking a task complete.

## 3. Architectural Principles (Open/Closed Principle)
1. **Adapter Pattern (`src/core/adapters/`):** UI components MUST NEVER call `fetch()` or Supabase SDK directly. All external data passes through `catalogAdapter.js`. Swapping Supabase Storage for a real database in the future must require zero changes to `.vue` components.
2. **Configuration-Driven Filters (`src/config/filters.config.js`):** Filtering rules are declarative objects evaluated by `src/core/filterEngine.js`. Do not hardcode `if/else` filter logic inside UI components.
3. **Scalable Multi-Theme CSS (`src/assets/styles/themes.css`):** All colors, surfaces, borders, and shadows must use semantic CSS custom properties (`--bg-base`, `--bg-surface`, `--bg-glass`, `--border-subtle`, `--accent-primary`, `--accent-dark`, `--text-main`, `--text-muted`) scoped under `[data-theme="..."]`.
4. **Bandwidth Optimization (Egress Protection):** Always load the lightweight file index in memory for instant filtering, but slice rendered items in batches (`BATCH_SIZE = 12`) with `loading="lazy"` on images to minimize Supabase Storage egress.

## 5. Filename Taxonomy Contract
Catalog files inside `catalog/` follow a strict 5-segment uppercase ASCII format (no accents, no `Ñ`):
`[CATEGORY]_[TEAM]_[SEASON]_[VARIANT]_[GARMENT].webp`
- `CATEGORY`: `CLUB` | `SEL`
- `TEAM`: Hyphen-separated uppercase (e.g., `BARCELONA-SC`, `ESPANA`, `FC-BARCELONA`)
- `SEASON`: 4-digit year (`2026`, `1998`) or `RETRO`
- `VARIANT`: `LOCAL`, `VISITA`, `TERCERA`, `100-ANOS-1`, `ED-LIMITADA`, etc.
- `GARMENT`: `CAMISETA`, `BUZO`, `CONJUNTO`, `IMPERMEABLE`, `PANTALONETA`, `POLO`

## 6. Code Standards & Constraints
- Language in code, comments, commits, and variables: **English** (UI labels/copy in **Spanish** as defined in `store.json` / UI specs).
- Use `<script setup>` with clean, small, single-responsibility Vue components.
- Avoid heavy third-party UI libraries; use `lucide-vue-next` for icons and pure CSS/Tailwind for transitions.
- Zero hardcoded business data (WhatsApp number, base price, delivery city "Milagro"[cite: 1]) inside components—read everything from `store.json`.
- **Strict Icon Tree-Shaking (`src/config/icons.registry.js`):** NEVER use wildcard imports (`import * as Icons from 'lucide-vue-next'`). Import only specific named icons inside a centralized `ICON_REGISTRY` map (with `Bell` as default fallback) so Vite bundles only used SVGs while still supporting dynamic icon names from `notifications.json` and `store.json`.
