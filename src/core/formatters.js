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

/**
 * Resolve the price of a specific kit. `store.prices` maps garment codes to
 * amounts; `basePrice` (or the legacy `defaultPrice`) is the fallback.
 */
export function resolveKitPrice(kit, store = {}) {
  const garment = String(kit?.garment ?? '').trim().toUpperCase()
  const prices = store?.prices
  const garmentPrice =
    garment && prices && typeof prices === 'object' && !Array.isArray(prices)
      ? prices[garment]
      : undefined

  const value = garmentPrice ?? store?.basePrice ?? store?.defaultPrice
  if (value === null || value === undefined || value === '') return null

  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function formatKitPrice(kit, store = {}, locale = 'es-EC') {
  return formatPrice(
    resolveKitPrice(kit, store),
    store?.currency,
    locale,
  )
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
