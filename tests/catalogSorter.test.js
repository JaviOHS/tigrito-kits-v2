import test from 'node:test'
import assert from 'node:assert/strict'

import {
  GARMENT_PRIORITY,
  VARIANT_PRIORITY,
  sortCatalogKits,
} from '../src/core/domain/catalogSorter.js'

function kit(overrides = {}) {
  const filename =
    overrides.filename ?? 'CLUB_TEST_2026_LOCAL_CAMISETA.webp'

  return {
    id: filename.replace(/\.webp$/i, ''),
    filename,
    team: 'Test',
    season: '2026',
    variant: 'LOCAL',
    garment: 'CAMISETA',
    ...overrides,
  }
}

function labels(kits) {
  return kits.map(
    (item) => `${item.season}-${item.team}-${item.garment}-${item.variant}`,
  )
}

test('recommended mode sorts by season, priority teams, garment and variant', () => {
  const kits = [
    kit({ filename: 'CLUB_ZETA_2025_LOCAL_CAMISETA.webp', team: 'Zeta', season: '2025' }),
    kit({ filename: 'CLUB_BETA_2026_LOCAL_JOGGER.webp', team: 'Beta', garment: 'JOGGER' }),
    kit({ filename: 'CLUB_ALPHA_2026_LOCAL_CAMISETA.webp', team: 'Alpha' }),
    kit({ filename: 'CLUB_BETA_2026_VISITA_CAMISETA.webp', team: 'Beta', variant: 'VISITA' }),
    kit({ filename: 'CLUB_ALPHA_RETRO_LOCAL_CAMISETA.webp', team: 'Alpha', season: 'RETRO' }),
  ]

  const sorted = sortCatalogKits(kits, {
    store: { priorityTeams: ['beta'] },
  })

  assert.deepEqual(labels(sorted), [
    '2026-Beta-CAMISETA-VISITA',
    '2026-Beta-JOGGER-LOCAL',
    '2026-Alpha-CAMISETA-LOCAL',
    '2025-Zeta-CAMISETA-LOCAL',
    'RETRO-Alpha-CAMISETA-LOCAL',
  ])
})

test('recommended mode orders garments by commercial hierarchy then alphabetically', () => {
  const shuffled = [...GARMENT_PRIORITY].reverse()
  const kits = [...shuffled, 'POLO', 'ALFOMBRA'].map((garment, index) =>
    kit({
      filename: `CLUB_TEST_2026_LOCAL_${garment}_${index}.webp`,
      garment,
    }),
  )

  const sorted = sortCatalogKits(kits)

  assert.deepEqual(
    sorted.map((item) => item.garment),
    [...GARMENT_PRIORITY, 'ALFOMBRA', 'POLO'],
  )
})

test('recommended mode orders variants by commercial hierarchy and aliases VISITA', () => {
  const variants = ['TERCERA', 'EXCLUSIVA', 'VISITANTE', 'LOCAL', 'ALTERNA', 'ED-LIMITADA']
  const kits = variants.map((variant, index) =>
    kit({
      filename: `CLUB_TEST_2026_${variant}_CAMISETA_${index}.webp`,
      variant,
    }),
  )

  const sorted = sortCatalogKits(kits)

  assert.deepEqual(
    sorted.map((item) => item.variant),
    [...VARIANT_PRIORITY, 'ED-LIMITADA', 'TERCERA'],
  )

  const visita = sortCatalogKits([
    kit({ filename: 'CLUB_TEST_2026_ALTERNA_CAMISETA.webp', variant: 'ALTERNA' }),
    kit({ filename: 'CLUB_TEST_2026_VISITA_CAMISETA.webp', variant: 'VISITA' }),
    kit({ filename: 'CLUB_TEST_2026_LOCAL_CAMISETA.webp', variant: 'LOCAL' }),
  ])

  assert.deepEqual(
    visita.map((item) => item.variant),
    ['LOCAL', 'VISITA', 'ALTERNA'],
  )
})

test('newest mode ignores priority teams and uses team alphabetical order', () => {
  const kits = [
    kit({ filename: 'CLUB_ALPHA_2025_LOCAL_CAMISETA.webp', team: 'Alpha', season: '2025' }),
    kit({ filename: 'CLUB_ZETA_2026_LOCAL_CAMISETA.webp', team: 'Zeta' }),
    kit({ filename: 'CLUB_ALPHA_RETRO_LOCAL_CAMISETA.webp', team: 'Alpha', season: 'RETRO' }),
    kit({ filename: 'CLUB_BETA_1998_LOCAL_CAMISETA.webp', team: 'Beta', season: '1998' }),
    kit({ filename: 'CLUB_ALPHA_2026_LOCAL_CAMISETA.webp', team: 'Alpha' }),
  ]

  const sorted = sortCatalogKits(kits, {
    mode: 'newest',
    store: { priorityTeams: ['Zeta'] },
  })

  assert.deepEqual(labels(sorted), [
    '2026-Alpha-CAMISETA-LOCAL',
    '2026-Zeta-CAMISETA-LOCAL',
    '2025-Alpha-CAMISETA-LOCAL',
    '1998-Beta-CAMISETA-LOCAL',
    'RETRO-Alpha-CAMISETA-LOCAL',
  ])
})

test('price-asc mode uses resolved currentPrice then season descending', () => {
  const store = {
    prices: { CAMISETA: 25, BUZO: 30 },
    overrides: [{ team: 'Ecuador', garment: 'CAMISETA', price: 20 }],
  }

  const kits = [
    kit({ filename: 'CLUB_ZETA_2026_LOCAL_BUZO.webp', team: 'Zeta', garment: 'BUZO' }),
    kit({ filename: 'CLUB_ALPHA_2025_LOCAL_CAMISETA.webp', team: 'Alpha', season: '2025' }),
    kit({ filename: 'SEL_ECUADOR_2026_LOCAL_CAMISETA.webp', team: 'Ecuador' }),
    kit({ filename: 'CLUB_BETA_2026_LOCAL_BUZO.webp', team: 'Beta', garment: 'BUZO' }),
    kit({ filename: 'CLUB_ALPHA_2026_LOCAL_CAMISETA.webp', team: 'Alpha' }),
    kit({ filename: 'CLUB_SIN-PRECIO_2026_LOCAL_POLO.webp', team: 'Sin Precio', garment: 'POLO' }),
  ]

  const sorted = sortCatalogKits(kits, { mode: 'price-asc', store })

  assert.deepEqual(labels(sorted), [
    '2026-Ecuador-CAMISETA-LOCAL',
    '2026-Alpha-CAMISETA-LOCAL',
    '2025-Alpha-CAMISETA-LOCAL',
    '2026-Beta-BUZO-LOCAL',
    '2026-Zeta-BUZO-LOCAL',
    '2026-Sin Precio-POLO-LOCAL',
  ])
})

test('missing priorityTeams falls back to alphabetical teams and keeps input intact', () => {
  const kits = [
    kit({ filename: 'CLUB_ZETA_2026_LOCAL_CAMISETA.webp', team: 'Zeta' }),
    kit({ filename: 'CLUB_ALPHA_2026_LOCAL_CAMISETA.webp', team: 'Alpha' }),
  ]
  const original = [...kits]

  const sorted = sortCatalogKits(kits)

  assert.deepEqual(
    sorted.map((item) => item.team),
    ['Alpha', 'Zeta'],
  )
  assert.deepEqual(kits, original)
})

test('handles invalid input and unknown modes deterministically', () => {
  assert.deepEqual(sortCatalogKits(null), [])
  assert.deepEqual(sortCatalogKits(undefined), [])

  const kits = [
    kit({ filename: 'CLUB_ZETA_2025_LOCAL_CAMISETA.webp', team: 'Zeta', season: '2025' }),
    kit({ filename: 'CLUB_ALPHA_2026_LOCAL_CAMISETA.webp', team: 'Alpha' }),
  ]

  assert.deepEqual(
    labels(sortCatalogKits(kits, { mode: 'unknown' })),
    labels(sortCatalogKits(kits, { mode: 'recommended' })),
  )
})
