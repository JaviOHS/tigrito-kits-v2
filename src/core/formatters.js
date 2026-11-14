const VARIANT_LABELS = Object.freeze({
  LOCAL: 'Local',
  VISITA: 'Visita',
  TERCERA: 'Tercera',
  '100-ANOS-1': '100 años',
  'ED-LIMITADA': 'Edición limitada',
})

const GARMENT_LABELS = Object.freeze({
  CAMISETA: 'Camiseta',
  BUZO: 'Buzo',
  CONJUNTO: 'Conjunto',
  IMPERMEABLE: 'Impermeable',
  PANTALONETA: 'Pantaloneta',
  POLO: 'Polo',
  JOGGER: 'Jogger',
})

const WORD_REPLACEMENTS = Object.freeze({
  ANOS: 'años',
})

function titleWord(word) {
  const lower = word.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function humanizeToken(value, knownLabels) {
  const token = String(value ?? '').trim().toUpperCase()
  if (!token) return ''

  if (knownLabels[token]) return knownLabels[token]

  return token
    .split('-')
    .filter(Boolean)
    .map((part) => WORD_REPLACEMENTS[part] ?? titleWord(part))
    .join(' ')
}

export function formatVariant(variant) {
  return humanizeToken(variant, VARIANT_LABELS)
}

export function formatGarment(garment) {
  return humanizeToken(garment, GARMENT_LABELS)
}

export function formatPrice(value, currency = 'USD', locale = 'es-EC') {
  if (value === null || value === undefined || value === '') return ''

  const amount = Number(value)
  if (!Number.isFinite(amount)) return ''

  const currencyCode = String(currency || 'USD').toUpperCase()

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount}`
  }
}

/**
 * Format a byte count for the admin image preview using Spanish decimal
 * notation. Keeps one decimal only for values below 10 in the chosen unit.
 */
export function formatFileSize(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return ''
  if (value < 1024) return `${Math.round(value)} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value / 1024
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10
  return `${String(rounded).replace('.', ',')} ${units[unitIndex]}`
}

function normalizeMatchValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function baseFilename(value) {
  const normalized = normalizeMatchValue(value)
  return normalized.split(/[\\/]/).pop() ?? ''
}

function toAmount(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null

  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

function getOverrideAmount(override) {
  // `price` is canonical; the aliases keep hand-edited configs forgiving.
  for (const key of ['price', 'currentPrice', 'amount']) {
    const amount = toAmount(override?.[key])
    if (amount !== null) return amount
  }

  return null
}

/**
 * Score an override against a kit. Optional matchers are compared
 * case-insensitively; at least one matcher must be present. Returns -1 when
 * the override does not apply, otherwise the number of matched fields.
 */
function scoreOverride(kit, override) {
  if (!override || typeof override !== 'object') return -1

  let score = 0

  if (normalizeMatchValue(override.filename)) {
    if (
      !baseFilename(kit?.filename) ||
      baseFilename(kit.filename) !== baseFilename(override.filename)
    ) {
      return -1
    }
    score += 1
  }

  if (normalizeMatchValue(override.team)) {
    if (
      normalizeMatchValue(kit?.team) !== normalizeMatchValue(override.team)
    ) {
      return -1
    }
    score += 1
  }

  if (normalizeMatchValue(override.garment)) {
    if (
      normalizeMatchValue(kit?.garment) !==
      normalizeMatchValue(override.garment)
    ) {
      return -1
    }
    score += 1
  }

  return score
}

/**
 * Resolve the standard and effective prices for a kit.
 *
 * `store.prices` maps garment codes to amounts, then `defaultPrice` and
 * `basePrice` are fallbacks. Optional `store.overrides` entries may match any
 * combination of `filename`, `team`, and `garment`; the most specific match
 * wins, with later entries winning ties.
 */
export function resolveKitPrice(kit, store = {}) {
  const garment = String(kit?.garment ?? '').trim().toUpperCase()
  const prices = store?.prices
  const garmentPrice =
    garment && prices && typeof prices === 'object' && !Array.isArray(prices)
      ? prices[garment]
      : undefined

  const standardPrice = toAmount(
    garmentPrice ?? store?.defaultPrice ?? store?.basePrice,
  )

  const overrides = Array.isArray(store?.overrides) ? store.overrides : []
  let bestMatch = null

  for (const override of overrides) {
    const amount = getOverrideAmount(override)
    if (amount === null) continue

    const score = scoreOverride(kit, override)
    if (score <= 0) continue

    if (!bestMatch || score >= bestMatch.score) {
      bestMatch = { amount, score }
    }
  }

  const currentPrice = bestMatch ? bestMatch.amount : standardPrice
  const originalPrice = standardPrice
  const hasDiscount =
    originalPrice !== null &&
    currentPrice !== null &&
    currentPrice < originalPrice

  return { currentPrice, originalPrice, hasDiscount }
}

/**
 * Format both prices used by the discount UI. `currentLabel` is always the
 * effective price; `originalLabel` is only rendered when `hasDiscount` is true.
 */
export function formatKitPricing(kit, store = {}, locale = 'es-EC') {
  const { currentPrice, originalPrice, hasDiscount } = resolveKitPrice(
    kit,
    store,
  )

  return {
    currentLabel: formatPrice(currentPrice, store?.currency, locale),
    originalLabel: formatPrice(originalPrice, store?.currency, locale),
    hasDiscount,
  }
}

export function formatKitPrice(kit, store = {}, locale = 'es-EC') {
  return formatKitPricing(kit, store, locale).currentLabel
}

export function buildWhatsAppUrl(number, message = '') {
  const digits = String(number ?? '').replace(/\D/g, '')
  if (!digits) return ''

  const query = message ? `?text=${encodeURIComponent(message)}` : ''

  return `https://wa.me/${digits}${query}`
}

/**
 * Build the order message once so every entry point (cards and detail modal)
 * sends the same product context to WhatsApp.
 */
export function buildKitOrderMessage(kit, store = {}) {
  if (!kit) return ''

  const details = [
    kit.team,
    kit.season ? `temporada ${kit.season}` : '',
    formatVariant(kit.variant),
    formatGarment(kit.garment),
  ]
    .filter(Boolean)
    .join(', ')

  const priceLabel = formatKitPrice(kit, store)

  return [
    store.whatsappGreeting,
    details ? `Quiero pedir: ${details}.` : '',
    priceLabel ? `Precio: ${priceLabel}.` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Format ISO config dates without letting the local timezone move them back a
 * day (config dates are calendar dates, not timestamps).
 */
export function formatNotificationDate(value, locale = 'es-EC') {
  if (value === null || value === undefined || value === '') return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  } catch {
    return ''
  }
}
