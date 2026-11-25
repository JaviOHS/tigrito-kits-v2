# Spec 10: Catalog Item Editing (Metadata Rename & Image Replacement)

## Objective
Allow authenticated admins to edit existing catalog items in the Admin Panel—either updating their 5-segment metadata (renaming the file in Supabase Storage) or replacing the photo file—without manually deleting and re-uploading from scratch.

## Requirements
1. **Storage Adapter Extension (`src/core/adapters/adminStorageAdapter.js`):**
   - Add `updateCatalogItem({ oldFilename, newFilename, newWebpBlob = null })`:
     - Validate `newFilename` via `validateCatalogFilename`.
     - If `newWebpBlob` is provided and `oldFilename === newFilename`: upload with `upsert: true` to `catalog/${newFilename}` (and append cache-busting query or re-fetch catalog).
     - If `oldFilename !== newFilename` and `newWebpBlob` is null: use Supabase Storage `.move('catalog/' + oldFilename, 'catalog/' + newFilename)` (preventing accidental overwrite if `newFilename` already exists unless confirmed).
     - If `oldFilename !== newFilename` and `newWebpBlob` is provided: upload `newWebpBlob` to `catalog/${newFilename}` (`upsert: false`), then remove `catalog/${oldFilename}`.
2. **Edit Mode in `CatalogUploader.vue`:**
   - Add an "Editar" action button next to the delete button on each item in the "Catálogo actual" list.
   - Clicking "Editar" loads that item's current image preview and pre-fills the 5-segment builder (`category`, `team`, `season`, `variant`, `garment`).
   - Allow saving metadata-only changes (without requiring a new photo) OR replacing the photo + metadata in one action, with a clear "Cancelar edición" button to return to upload mode.
   - Refresh the live catalog immediately after saving.

## Validation Criteria
- Renaming `CLUB_REAL-MADRID_2026_LOCAL_CAMISETA.webp` to `CLUB_REAL-MADRID_2026_VISITANTE_CAMISETA.webp` moves the object cleanly in Supabase Storage without data loss.
- Replacing a photo while keeping the same filename updates the image cleanly.
- `npm run build` passes with zero errors.
