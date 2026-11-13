# Spec 08: Lazy-Loaded Admin Panel (Raw JSON Editor & Catalog Uploader)

## Objective
Implement a lazy-loaded, mobile-friendly Admin Drawer/View (`#admin` hash or subtle footer trigger) for authenticated admins to edit raw JSON configs and upload optimized catalog images.

## Requirements
1. **Code Splitting & Icons:**
   - Load `AdminPanel.vue` via `defineAsyncComponent` so public visitors download zero admin code.
   - Register only required icons (`Lock`, `LogOut`, `Save`, `Upload`, `Trash2`, `CheckCircle`, `AlertCircle`, `FileJson`, `ImagePlus`) in `src/config/icons.registry.js`.
2. **Login View (`AdminLoginForm.vue`):**
   - Clean themed email + password form using semantic CSS variables (`themes.css`).
3. **Raw JSON Config Editor (`JsonConfigEditor.vue`):**
   - Selector tabs for `store.json`, `notifications.json`, and `top-picks.json`.
   - Loads live file content via `fetchConfig`, displays it in a monospace `<textarea>` (`spellcheck="false"`), includes a "Format JSON" button (`JSON.stringify(..., null, 2)`), live syntax validation indicator, and "Save to Cloud" button calling `saveConfigJson` + refreshing the active catalog state.
4. **Catalog Image Manager (`CatalogUploader.vue`):**
   - File picker + drag-and-drop zone accepting JPG/PNG/WebP.
   - Interactive 5-segment filename builder (Category selector `CLUB`/`SEL`, Team input with datalist of existing teams, Season input, Variant input, Garment selector `CAMISETA`/`BUZO`/`CONJUNTO`/`IMPERMEABLE`/`PANTALONETA`/`POLO`) showing the live resulting filename preview (`SEL_ECUADOR_2026_LOCAL_CAMISETA.webp`).
   - Runs `optimizeImageToWebp` automatically, displays original vs. WebP size preview, uploads to Supabase Storage, and refreshes the catalog grid immediately.
   - Includes a compact list of current catalog items with quick delete action (`deleteCatalogImage`) with confirmation.

## Validation Criteria
- Public bundle size remains unaffected thanks to `defineAsyncComponent`.
- Editing `store.json` (e.g., updating `prices` or `whatsappNumber`) and saving immediately updates the storefront without page reload.
- `npm run build` succeeds with zero warnings.
