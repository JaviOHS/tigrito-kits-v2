import { parseCatalogFilename } from '../catalogParser.js'

/**
 * Local fixtures keep the catalog usable before Supabase is configured.
 * Images are generated as inline SVG data URLs so the app works offline.
 */
const CATALOG_FILENAMES = Object.freeze([
  'CLUB_AC-MILAN_2025_TERCERA_CAMISETA.webp',
  'CLUB_ATLETICO-DE-MADRID_2026_LOCAL_CAMISETA.webp',
  'CLUB_ATLETICO-DE-MADRID_2026_LOCAL_IMPERMEABLE.webp',
  'CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA.webp',
  'CLUB_BARCELONA-SC_2026_LOCAL_CAMISETA.webp',
  'CLUB_BARCELONA-SC_2026_LOCAL_BUZO.webp',
  'CLUB_BAYERN-MUNICH_2026_LOCAL_CAMISETA.webp',
  'CLUB_FC-BARCELONA_2024_VISITA_CAMISETA.webp',
  'CLUB_MANCHESTER-CITY_2026_LOCAL_CAMISETA.webp',
  'CLUB_PARIS-SAINT-GERMAIN_2026_LOCAL_CAMISETA.webp',
  'CLUB_REAL-MADRID_2025_VISITA_CAMISETA.webp',
  'CLUB_REAL-MADRID_2026_LOCAL_CAMISETA.webp',
  'CLUB_REAL-MADRID_RETRO_LOCAL_POLO.webp',
  'CLUB_RIVER-PLATE_2024_LOCAL_CAMISETA.webp',
  'MARCA_NIKE_2026_NEGRO_IMPERMEABLE.webp',
  'SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp',
  'SEL_ARGENTINA_2026_LOCAL_CONJUNTO.webp',
  'SEL_BRASIL_2026_LOCAL_CAMISETA.webp',
  'SEL_ECUADOR_2025_EDICION-1_IMPERMEABLE.webp',
  'SEL_ECUADOR_2026_LOCAL_CAMISETA.webp',
  'SEL_ECUADOR_2026_LOCAL_CONJUNTO.webp',
  'SEL_ESPANA_1998_LOCAL_CAMISETA.webp',
  'SEL_ESPANA_2026_LOCAL_CAMISETA.webp',
  'SEL_ESPANA_2026_VISITA_PANTALONETA.webp',
])

const TEAM_PALETTES = Object.freeze({
  'AC-MILAN': { primary: '#FB090B', secondary: '#111111' },
  'ATLETICO-DE-MADRID': { primary: '#CB3524', secondary: '#272E61' },
  'BARCELONA-SC': { primary: '#A50044', secondary: '#004D98' },
  'BAYERN-MUNICH': { primary: '#DC052D', secondary: '#0066B2' },
  'FC-BARCELONA': { primary: '#004D98', secondary: '#A50044' },
  'MANCHESTER-CITY': { primary: '#6CABDD', secondary: '#1C2C5B' },
  'PARIS-SAINT-GERMAIN': { primary: '#004170', secondary: '#DA291C' },
  'REAL-MADRID': { primary: '#FFFFFF', secondary: '#FEBE10' },
  'RIVER-PLATE': { primary: '#FFFFFF', secondary: '#DA291C' },
  ARGENTINA: { primary: '#75AADB', secondary: '#FFFFFF' },
  BRASIL: { primary: '#FFDF00', secondary: '#009C3B' },
  ECUADOR: { primary: '#FFD100', secondary: '#0033A0' },
  ESPANA: { primary: '#C60B1E', secondary: '#FFC400' },
  NIKE: { primary: '#111111', secondary: '#FFFFFF' },
})

const DEFAULT_PALETTE = Object.freeze({
  primary: '#E08A3C',
  secondary: '#2C323B',
})

function escapeXml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character],
  )
}

function createJerseyImageUrl(product) {
  const teamSegment = product.id.split('_')[1] ?? ''
  const palette = TEAM_PALETTES[teamSegment] ?? DEFAULT_PALETTE
  const label = escapeXml(product.team)
  const meta = escapeXml(
    `${product.season} · ${product.variant.replaceAll('-', ' ')}`,
  )

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${label}">
  <rect width="600" height="600" fill="#F6F5F2"/>
  <circle cx="512" cy="88" r="54" fill="${palette.secondary}" opacity="0.14"/>
  <circle cx="72" cy="540" r="86" fill="${palette.primary}" opacity="0.10"/>
  <path d="M205 145 L270 110 C285 135 315 135 330 110 L395 145 L455 220 L395 270 L370 240 L370 500 L230 500 L230 240 L205 270 L145 220 Z" fill="${palette.primary}" stroke="#1C1E22" stroke-width="8" stroke-linejoin="round"/>
  <path d="M270 110 C285 145 315 145 330 110" fill="none" stroke="#1C1E22" stroke-width="8"/>
  <path d="M230 360 H370" stroke="${palette.secondary}" stroke-width="34" opacity="0.95"/>
  <path d="M230 424 H370" stroke="${palette.secondary}" stroke-width="10" opacity="0.55"/>
  <text x="300" y="556" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-weight="700" fill="#1C1E22">${label}</text>
  <text x="300" y="584" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" letter-spacing="2" fill="#5C626D">${meta}</text>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    Object.values(value).forEach(deepFreeze)
  }

  return value
}

function createLogoDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Tigrito KitLab">
  <rect width="128" height="128" rx="64" fill="#E08A3C"/>
  <text x="64" y="82" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="46" font-weight="700" fill="#1C1E22">TK</text>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const parsedCatalog = CATALOG_FILENAMES.map((filename) =>
  parseCatalogFilename(filename),
).filter(Boolean)

export const FALLBACK_CATALOG_FILENAMES = CATALOG_FILENAMES

export const FALLBACK_CATALOG = deepFreeze(
  parsedCatalog.map((product) => ({
    ...product,
    imageUrl: createJerseyImageUrl(product),
  })),
)

const FALLBACK_STORE = {
  brandName: 'Tigrito KitLab',
  tagline: 'Camisetas que cuentan historias',
  logoUrl: createLogoDataUrl(),
  whatsappNumber: '593999999999',
  whatsappGreeting:
    'Hola Tigrito KitLab, quiero información sobre una camiseta.',
  basePrice: 35,
  prices: {
    CAMISETA: 25,
    IMPERMEABLE: 30,
    CONJUNTO: 40,
    PANTALONETA: 20,
    JOGGER: 25,
  },
  overrides: [
    {
      team: 'Ecuador',
      garment: 'CAMISETA',
      price: 20,
    },
  ],
  currency: 'USD',
  deliveryCity: 'Milagro',
  paymentMethods: ['Transferencia bancaria', 'Efectivo contra entrega'],
  reservationPolicy:
    'Los pedidos se reservan por 24 horas desde la confirmación.',
  localDeliveryPolicy:
    'Entrega local en Milagro para pedidos confirmados antes de las 15:00.',
  infoSections: [
    {
      title: 'Pagos',
      body: 'Aceptamos transferencia bancaria y efectivo contra entrega.',
    },
    {
      title: 'Reservas',
      body: 'Tu pedido queda reservado por 24 horas mientras confirmas el pago.',
    },
    {
      title: 'Entrega local',
      body: 'Coordinamos entregas en Milagro y envíos a todo el país.',
    },
  ],
  ui: {
    searchPlaceholder: 'Busca por equipo o temporada',
    emptyState: 'No encontramos camisetas con esos filtros.',
  },
}

const FALLBACK_NOTIFICATIONS = {
  updatedAt: '2026-11-01',
  notifications: [
    {
      id: 'drop-2026',
      title: 'Drop 2026 disponible',
      message: 'Ya llegaron las camisetas de la temporada 2026.',
      icon: 'Sparkles',
      active: true,
      date: '2026-11-01',
    },
    {
      id: 'local-delivery',
      title: 'Entrega local en Milagro',
      message: 'Pedidos confirmados antes de las 15:00 se entregan el mismo día.',
      icon: 'Truck',
      active: true,
      date: '2026-10-15',
    },
    {
      id: 'retro-preorder',
      title: 'Retro bajo pedido',
      message: 'Las prendas retro requieren 48 horas de anticipación.',
      icon: 'Clock',
      active: false,
      date: '2026-09-20',
    },
  ],
}

const FALLBACK_TOP_PICKS = {
  teams: ['Barcelona SC', 'Argentina', 'Real Madrid'],
  specificFiles: [
    'CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA.webp',
    'SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp',
    'SEL_ESPANA_2026_LOCAL_CAMISETA.webp',
  ],
}

export const FALLBACK_CONFIGS = deepFreeze({
  'store.json': FALLBACK_STORE,
  'notifications.json': FALLBACK_NOTIFICATIONS,
  'top-picks.json': FALLBACK_TOP_PICKS,
})
