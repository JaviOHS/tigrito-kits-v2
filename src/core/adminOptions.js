import { formatGarment, formatVariant } from './formatters.js'

function normalizeCode(value) {
  return String(value ?? '').trim().toUpperCase()
}

function sortByLabel(options, formatter) {
  return options.sort((a, b) =>
    formatter(a).localeCompare(formatter(b), 'es'),
  )
}

/**
 * Unique team names from the live catalog, ready for the admin combobox.
 */
export function buildTeamOptions(kits = []) {
  const teams = new Set()

  for (const kit of Array.isArray(kits) ? kits : []) {
    const team = String(kit?.team ?? '').trim()
    if (team) teams.add(team)
  }

  return [...teams].sort((a, b) => a.localeCompare(b, 'es'))
}

/**
 * Unique variant codes from the live catalog, formatted for display while
 * keeping the taxonomy code as the stored value.
 */
export function buildVariantOptions(kits = []) {
  const variants = new Set()

  for (const kit of Array.isArray(kits) ? kits : []) {
    const variant = normalizeCode(kit?.variant)
    if (variant) variants.add(variant)
  }

  return sortByLabel(
    [...variants].map((value) => ({
      value,
      label: formatVariant(value),
    })),
    (option) => option.label,
  )
}

/**
 * Garment options come from the store price table and the live catalog. This
 * keeps `store.json` as the source of truth while preserving legacy codes that
 * already exist in storage. Custom free-text values are still accepted by the
 * combobox, so no hardcoded garment list is needed.
 */
export function buildGarmentOptions(store = {}, kits = []) {
  const garments = new Set()
  const prices = store?.prices

  if (prices && typeof prices === 'object' && !Array.isArray(prices)) {
    for (const key of Object.keys(prices)) {
      const garment = normalizeCode(key)
      if (garment) garments.add(garment)
    }
  }

  for (const kit of Array.isArray(kits) ? kits : []) {
    const garment = normalizeCode(kit?.garment)
    if (garment) garments.add(garment)
  }

  return sortByLabel(
    [...garments].map((value) => ({
      value,
      label: formatGarment(value),
    })),
    (option) => option.label,
  )
}
