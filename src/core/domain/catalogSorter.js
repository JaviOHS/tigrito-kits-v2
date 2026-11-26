import { resolveKitPrice } from '../formatters.js'

export const DEFAULT_SORT_MODE = 'recommended'

/**
 * Commercial display order. Listed codes rank first in this exact order;
 * unknown codes fall back to alphabetical order after the known ones.
 */
export const GARMENT_PRIORITY = Object.freeze([
  'CAMISETA',
  'CONJUNTO',
  'BUZO',
  'IMPERMEABLE',
  'PANTALONETA',
  'JOGGER',
])

export const VARIANT_PRIORITY = Object.freeze([
  'LOCAL',
  'VISITANTE',
  'ALTERNA',
  'EXCLUSIVA',
])

const GARMENT_RANK = new Map(
  GARMENT_PRIORITY.map((code, index) => [code, index]),
)

const VARIANT_RANK = new Map(
  VARIANT_PRIORITY.map((code, index) => [code, index]),
)

// The filename taxonomy uses VISITA while store copy often says Visitante.
VARIANT_RANK.set('VISITA', VARIANT_RANK.get('VISITANTE'))

function normalizeCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
}

function normalizeTeam(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'es', {
    sensitivity: 'base',
  })
}

function parseSeason(season) {
  const normalized = normalizeCode(season)
  return /^\d{4}$/.test(normalized) ? Number(normalized) : null
}

/**
 * Numeric seasons rank newest first. Non-numeric labels (RETRO, custom labels)
 * come after every numeric season and are ordered alphabetically among
 * themselves.
 */
function compareSeasonsDesc(left, right) {
  const leftSeason = parseSeason(left?.season)
  const rightSeason = parseSeason(right?.season)

  if (leftSeason !== null && rightSeason !== null) {
    return rightSeason - leftSeason
  }

  if (leftSeason !== null) return -1
  if (rightSeason !== null) return 1

  return compareText(
    normalizeCode(left?.season),
    normalizeCode(right?.season),
  )
}

function buildPriorityIndex(priorityTeams) {
  const index = new Map()

  if (!Array.isArray(priorityTeams)) return index

  for (const team of priorityTeams) {
    const key = normalizeTeam(team)
    if (key && !index.has(key)) index.set(key, index.size)
  }

  return index
}

function comparePriorityTeams(left, right, priorityIndex) {
  const leftRank = priorityIndex.get(normalizeTeam(left?.team))
  const rightRank = priorityIndex.get(normalizeTeam(right?.team))
  const leftValue = leftRank ?? priorityIndex.size
  const rightValue = rightRank ?? priorityIndex.size

  if (leftValue !== rightValue) return leftValue - rightValue

  return compareText(left?.team, right?.team)
}

function compareByPriority(leftCode, rightCode, rankMap, priorityList) {
  const leftRank = rankMap.get(leftCode) ?? priorityList.length
  const rightRank = rankMap.get(rightCode) ?? priorityList.length

  if (leftRank !== rightRank) return leftRank - rightRank

  return compareText(leftCode, rightCode)
}

function compareGarments(left, right) {
  return compareByPriority(
    normalizeCode(left?.garment),
    normalizeCode(right?.garment),
    GARMENT_RANK,
    GARMENT_PRIORITY,
  )
}

function compareVariants(left, right) {
  return compareByPriority(
    normalizeCode(left?.variant),
    normalizeCode(right?.variant),
    VARIANT_RANK,
    VARIANT_PRIORITY,
  )
}

function compareFilename(left, right) {
  return compareText(left?.filename ?? left?.id, right?.filename ?? right?.id)
}

function compareRecommended(left, right, priorityIndex) {
  return (
    compareSeasonsDesc(left, right) ||
    comparePriorityTeams(left, right, priorityIndex) ||
    compareGarments(left, right) ||
    compareVariants(left, right) ||
    compareFilename(left, right)
  )
}

function compareNewest(left, right) {
  return (
    compareSeasonsDesc(left, right) ||
    compareText(left?.team, right?.team) ||
    compareGarments(left, right) ||
    compareVariants(left, right) ||
    compareFilename(left, right)
  )
}

function resolvePrice(kit, store) {
  const { currentPrice } = resolveKitPrice(kit, store)
  return currentPrice === null || currentPrice === undefined
    ? Number.POSITIVE_INFINITY
    : currentPrice
}

function comparePriceAsc(left, right, store) {
  const leftPrice = resolvePrice(left, store)
  const rightPrice = resolvePrice(right, store)

  if (leftPrice !== rightPrice) return leftPrice < rightPrice ? -1 : 1

  return (
    compareSeasonsDesc(left, right) ||
    compareText(left?.team, right?.team) ||
    compareGarments(left, right) ||
    compareVariants(left, right) ||
    compareFilename(left, right)
  )
}

/**
 * Pure, deterministic catalog sorter.
 *
 * @param {Array<object>} kits Catalog products.
 * @param {{ mode?: 'recommended'|'newest'|'price-asc', store?: object }} options
 *   `store.priorityTeams` drives the recommended team order; `store.prices` and
 *   `store.overrides` drive price-asc sorting.
 * @returns {Array<object>} A new sorted array; the input is never mutated.
 */
export function sortCatalogKits(kits, options = {}) {
  if (!Array.isArray(kits)) return []

  const { mode = DEFAULT_SORT_MODE, store = {} } = options ?? {}
  const priorityIndex = buildPriorityIndex(store?.priorityTeams)
  const items = kits.filter(Boolean)

  if (mode === 'newest') {
    return [...items].sort(compareNewest)
  }

  if (mode === 'price-asc') {
    return [...items].sort((left, right) =>
      comparePriceAsc(left, right, store),
    )
  }

  return [...items].sort((left, right) =>
    compareRecommended(left, right, priorityIndex),
  )
}
