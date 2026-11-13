# Spec 02: Filename Parser & Supabase Storage Adapter

## Objective
Build the pure JavaScript domain layer (`src/core/`) to parse 5-segment filenames and fetch catalog/config JSONs from Supabase Storage.

## Requirements
1. **Filename Parser (`src/core/catalogParser.js`):**
   - Parse `[CATEGORY]_[TEAM]_[SEASON]_[VARIANT]_[GARMENT].webp`.
   - Format `team`: replace `-` with spaces, Title Case words, preserve uppercase acronyms (`SC`, `FC`, `AC`, `DP`), keep Spanish connectors (`de`, `del`, `la`) lowercase.
   - Determine `isRetro`: `true` if `SEASON === 'RETRO'` or numeric year `<= 2018`.
   - Return normalized product object: `{ id, filename, imageUrl, category, categoryLabel, team, season, isRetro, variant, garment }`.
   - Gracefully handle malformed filenames without throwing uncaught exceptions.
2. **Storage Adapter (`src/core/adapters/supabaseStorageAdapter.js`):**
   - Implement `fetchCatalog()`: calls Supabase Storage list endpoint (`POST /storage/v1/object/list/${bucket}` with `{ prefix: 'catalog/', limit: 1000 }`), filters `.webp` files, maps public URLs (`/storage/v1/object/public/${bucket}/catalog/${name}`), and parses them.
   - Implement `fetchConfig(fileName)`: fetches `config/store.json`, `config/notifications.json`, and `config/top-picks.json` with cache-busting query param (`?t=`).
   - Provide clean fallback mock data when `VITE_SUPABASE_URL` is not yet configured so local development works immediately.

## Validation Criteria
- Unit/console verification confirms `SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp` and `CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA.webp` parse accurately.
- Fallback data loads cleanly when env vars are empty.
