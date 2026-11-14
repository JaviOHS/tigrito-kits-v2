const CATEGORY_LABELS = Object.freeze({
  CLUB: 'Club',
  SEL: 'Selección',
  MARCA: 'Marca',
})

const TEAM_ACRONYMS = new Set([
  'AC',
  'AS',
  'CA',
  'CD',
  'CF',
  'CSD',
  'DP',
  'FC',
  'FBC',
  'PSG',
  'RC',
  'SC',
  'SS',
  'SSC',
  'US',
])

const SPANISH_CONNECTORS = new Set(['de', 'del', 'la', 'las', 'los', 'y'])

const CATALOG_FILENAME_PATTERN =
  /^(CLUB|SEL|MARCA)_([A-Z0-9-]+)_(RETRO|\d{4})_([A-Z0-9-]+)_([A-Z0-9-]+)\.webp$/i

function getBaseName(filename) {
  return filename.trim().split(/[\\/]/).pop()
}

function toTitleCase(word) {
  const lower = word.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/**
 * Convert a taxonomy team segment into a display name.
 * Examples: BARCELONA-SC -> Barcelona SC, ATLETICO-DE-MADRID -> Atletico de Madrid.
 */
export function formatTeamName(teamSegment) {
  if (typeof teamSegment !== 'string') return ''

  return teamSegment
    .trim()
    .toUpperCase()
    .split('-')
    .filter(Boolean)
    .map((part, index) => {
      const lower = part.toLowerCase()

      if (index > 0 && SPANISH_CONNECTORS.has(lower)) return lower
      if (TEAM_ACRONYMS.has(part)) return part

      return toTitleCase(part)
    })
    .join(' ')
}

/**
 * Parse a catalog filename into a normalized product.
 * Returns null for anything outside the 5-segment taxonomy contract.
 */
export function parseCatalogFilename(filename, imageUrl = '') {
  try {
    if (typeof filename !== 'string') return null

    const baseName = getBaseName(filename)
    if (!baseName) return null

    const match = CATALOG_FILENAME_PATTERN.exec(baseName)
    if (!match) return null

    const [, rawCategory, rawTeam, rawSeason, rawVariant, rawGarment] = match
    const category = rawCategory.toUpperCase()
    const team = formatTeamName(rawTeam)
    const season = rawSeason.toUpperCase()
    const variant = rawVariant.toUpperCase()
    const garment = rawGarment.toUpperCase()

    if (!team || !/[A-Z0-9]/.test(variant) || !/[A-Z0-9]/.test(garment)) {
      return null
    }

    const year = Number.parseInt(season, 10)
    const isRetro = season === 'RETRO' || (Number.isFinite(year) && year <= 2018)

    return {
      id: baseName.replace(/\.webp$/i, ''),
      filename: baseName,
      imageUrl: typeof imageUrl === 'string' ? imageUrl : '',
      category,
      categoryLabel: CATEGORY_LABELS[category] ?? category,
      team,
      season,
      isRetro,
      variant,
      garment,
    }
  } catch {
    return null
  }
}

export function isValidCatalogFilename(filename) {
  return parseCatalogFilename(filename) !== null
}
