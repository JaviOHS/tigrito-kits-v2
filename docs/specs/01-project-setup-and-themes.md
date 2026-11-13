# Spec 01: Project Bootstrap & Scalable Theme System

## Objective
Initialize the Vue 3 + Vite + Tailwind CSS project structure and implement the semantic CSS custom property theme engine.

## Requirements
1. Use Context7 to verify latest Vite + Vue 3 + Tailwind CSS setup and `lucide-vue-next`.
2. Create folder structure: `src/core/adapters/`, `src/config/`, `src/composables/`, `src/components/`, `src/assets/styles/`.
3. Create `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_BUCKET=tigrito-assets`.
4. Implement `src/assets/styles/themes.css` with semantic variables and two complete themes:
   - `[data-theme="paper-light"]` (Default): `--bg-base: #F6F5F2`, `--bg-surface: #FFFFFF`, `--bg-glass: rgba(246, 245, 242, 0.85)`, `--border-subtle: #E5E2DC`, `--accent-primary: #E08A3C`, `--accent-dark: #2C323B`, `--text-main: #1C1E22`, `--text-muted: #5C626D`.
   - `[data-theme="slate-dark"]`: `--bg-base: #14171C`, `--bg-surface: #1E232B`, `--bg-glass: rgba(20, 23, 28, 0.85)`, `--border-subtle: #2E3540`, `--accent-primary: #F09A49`, `--accent-dark: #F4F3EF`, `--text-main: #F4F3EF`, `--text-muted: #9CA3AF`.
5. Create `src/composables/useTheme.js` to persist theme choice in `localStorage` and apply `data-theme` to `document.documentElement`.

## Validation Criteria
- `npm run build` succeeds with zero errors.
- Toggling `data-theme` dynamically updates CSS variables across the root document.
