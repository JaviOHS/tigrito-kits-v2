# Spec 06: Supabase Auth & Authenticated Storage Write Adapter

## Objective
Extend the domain/adapter layer to support admin authentication via Supabase Auth and authenticated write operations (upload/overwrite/delete) on Supabase Storage `tigrito-assets`, preserving strict separation from UI components.

## Requirements
1. **Context7 Verification:** Query Context7 for `@supabase/supabase-js` v2 Auth (`signInWithPassword`, `signOut`, `getSession`, `onAuthStateChange`) and Storage (`upload` with `upsert: true`, `remove`).
2. **Auth & Admin Adapter (`src/core/adapters/adminStorageAdapter.js`):**
   - Encapsulate Supabase client creation using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   - Expose clean methods: `signInAdmin(email, password)`, `signOutAdmin()`, `getAdminSession()`, `onAdminAuthChange(callback)`.
   - Expose storage write methods:
     - `saveConfigJson(fileName, jsonString)`: validates `JSON.parse(jsonString)` before uploading formatted JSON (`application/json`, `cacheControl: '0'`, `upsert: true`) to `config/${fileName}`.
     - `uploadCatalogImage(finalFilename, webpBlob)`: validates 5-segment taxonomy via `catalogParser` before uploading (`image/webp`, `upsert: true`) to `catalog/${finalFilename}`.
     - `deleteCatalogImage(filename)`: deletes `catalog/${filename}` from bucket.
3. **Composable (`src/composables/useAdminAuth.js`):** Reactive `user`, `isAuthenticated`, `authLoading`, `authError`, `login`, and `logout` state.

## Validation Criteria
- UI components never import `@supabase/supabase-js` directly.
- `saveConfigJson` rejects malformed JSON locally before making any network request.
- `npm run build` passes cleanly.
