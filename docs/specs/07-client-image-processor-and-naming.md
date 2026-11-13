# Spec 07: Client-Side WebP Optimizer & 5-Segment Filename Builder

## Objective
Create a pure browser utility to compress/resize uploaded images into lightweight `.webp` files and enforce the strict 5-segment naming taxonomy (`[CATEGORY]_[TEAM]_[SEASON]_[VARIANT]_[GARMENT].webp`).

## Requirements
1. **Client Image Optimizer (`src/core/imageOptimizer.js`):**
   - Pure browser function `optimizeImageToWebp(file, { maxDimension = 1400, quality = 0.82 })`.
   - Loads image file via `createImageBitmap` or `Image`, scales proportionally if width or height exceeds `maxDimension`, draws onto an offscreen `<canvas>`, and exports a `Blob` (`image/webp`).
   - Returns `{ blob, width, height, originalSize, optimizedSize }` for previewing compression savings before upload.
2. **Filename Builder & Validator (`src/core/filenameBuilder.js`):**
   - Helper `buildCatalogFilename({ category, team, season, variant, garment })` that normalizes inputs to uppercase ASCII (strips accents/diacritics, converts `Ñ` to `N`, replaces spaces with `-`, strips invalid symbols) and joins the 5 segments with `_` + `.webp`.
   - Helper `validateCatalogFilename(filename)` verifying exact 5-segment structure and parseability via `parseCatalogFilename`.

## Validation Criteria
- Accented inputs like `"España"` or `"100 Años 1"` normalize cleanly to `ESPANA` and `100-ANOS-1`.
- Output `.webp` blob preserves aspect ratio and reduces file weight cleanly.
