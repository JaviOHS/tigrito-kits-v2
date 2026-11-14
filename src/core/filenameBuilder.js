import { parseCatalogFilename } from './catalogParser.js'

const SEGMENT_PATTERN = '[A-Z0-9]+(?:-[A-Z0-9]+)*'
const STRICT_FILENAME_PATTERN = new RegExp(
  `^${SEGMENT_PATTERN}(?:_${SEGMENT_PATTERN}){4}\\.webp$`,
)

/**
 * Canonical garment codes used by the admin UI. The builder remains generic
 * for backward compatibility, but new garment suggestions belong here.
 */
export const GARMENT_OPTIONS = Object.freeze([
  'CAMISETA',
  'BUZO',
  'CONJUNTO',
  'IMPERMEABLE',
  'PANTALONETA',
  'POLO',
  'JOGGER',
])

// NFD handles most Latin accents; these letters do not decompose cleanly.
const ASCII_FALLBACKS = Object.freeze({
  'Ø': 'O',
  'Æ': 'AE',
  'Œ': 'OE',
  'Ł': 'L',
  'Đ': 'D',
  'Ð': 'D',
  'Þ': 'TH',
})

/**
 * Normalize one taxonomy segment to uppercase ASCII words joined by hyphens.
 * Accents are stripped, Ñ becomes N, whitespace becomes a hyphen, and other
 * unsupported symbols are removed.
 */
function normalizeCatalogSegment(value) {
  if (value === null || value === undefined) return ''

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[ØÆŒŁĐÐÞ]/g, (character) => ASCII_FALLBACKS[character] ?? '')
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Validate the exact taxonomy shape and the parser's category/season rules.
 * Paths, lowercase names, empty segments, and non-WebP extensions are rejected.
 */
export function validateCatalogFilename(filename) {
  if (typeof filename !== 'string') return false
  if (!filename || filename.trim() !== filename) return false
  if (filename.includes('/') || filename.includes('\\')) return false
  if (!STRICT_FILENAME_PATTERN.test(filename)) return false

  return parseCatalogFilename(filename) !== null
}

/**
 * Build a catalog filename from raw admin input. Returns an empty string when
 * any segment is missing or the normalized result is outside the taxonomy.
 */
export function buildCatalogFilename(input = {}) {
  const { category, team, season, variant, garment } = input ?? {}
  const segments = [category, team, season, variant, garment].map(
    normalizeCatalogSegment,
  )

  if (segments.some((segment) => !segment)) return ''

  const filename = `${segments.join('_')}.webp`

  return validateCatalogFilename(filename) ? filename : ''
}
