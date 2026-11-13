import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatTeamName,
  parseCatalogFilename,
} from '../src/core/catalogParser.js'
import { createSupabaseStorageAdapter } from '../src/core/adapters/supabaseStorageAdapter.js'

const ARGENTINA_URL =
  'https://example.supabase.co/storage/v1/object/public/tigrito-assets/catalog/SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp'

test('parses the Argentina 2014 fixture accurately', () => {
  const product = parseCatalogFilename(
    'SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp',
    ARGENTINA_URL,
  )

  assert.deepEqual(product, {
    id: 'SEL_ARGENTINA_2014_LOCAL_CAMISETA',
    filename: 'SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp',
    imageUrl: ARGENTINA_URL,
    category: 'SEL',
    categoryLabel: 'Selección',
    team: 'Argentina',
    season: '2014',
    isRetro: true,
    variant: 'LOCAL',
    garment: 'CAMISETA',
  })
})

test('parses the Barcelona SC anniversary fixture accurately', () => {
  const product = parseCatalogFilename(
    'CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA.webp',
  )

  assert.equal(product.id, 'CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA')
  assert.equal(product.category, 'CLUB')
  assert.equal(product.categoryLabel, 'Club')
  assert.equal(product.team, 'Barcelona SC')
  assert.equal(product.season, '2025')
  assert.equal(product.isRetro, false)
  assert.equal(product.variant, '100-ANOS-1')
  assert.equal(product.garment, 'CAMISETA')
})

test('formats team segments with acronyms and Spanish connectors', () => {
  assert.equal(formatTeamName('BARCELONA-SC'), 'Barcelona SC')
  assert.equal(formatTeamName('FC-BARCELONA'), 'FC Barcelona')
  assert.equal(formatTeamName('AC-MILAN'), 'AC Milan')
  assert.equal(formatTeamName('ATLETICO-DE-MADRID'), 'Atletico de Madrid')
  assert.equal(formatTeamName('LA-CORUNA'), 'La Coruna')
  assert.equal(formatTeamName('DP'), 'DP')
})

test('detects retro seasons at the 2018 boundary and for RETRO', () => {
  assert.equal(
    parseCatalogFilename('CLUB_TEST_2018_LOCAL_CAMISETA.webp').isRetro,
    true,
  )
  assert.equal(
    parseCatalogFilename('CLUB_TEST_2019_LOCAL_CAMISETA.webp').isRetro,
    false,
  )
  assert.equal(
    parseCatalogFilename('SEL_TEST_RETRO_LOCAL_CAMISETA.webp').isRetro,
    true,
  )
})

test('returns null for malformed filenames without throwing', () => {
  const malformed = [
    null,
    undefined,
    '',
    'broken.webp',
    'CLUB_TEAM_2025_LOCAL.webp',
    'CLUB_TEAM_2025_LOCAL_CAMISETA.png',
    'INVALID_TEAM_2025_LOCAL_CAMISETA.webp',
    'CLUB_TEAM_20_LOCAL_CAMISETA.webp',
    'CLUB_--_2025_LOCAL_CAMISETA.webp',
  ]

  for (const filename of malformed) {
    assert.doesNotThrow(() => parseCatalogFilename(filename))
    assert.equal(parseCatalogFilename(filename), null)
  }
})

test('normalizes nested catalog paths', () => {
  const product = parseCatalogFilename(
    'catalog/SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp',
  )

  assert.equal(product.filename, 'SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp')
  assert.equal(product.id, 'SEL_ARGENTINA_2014_LOCAL_CAMISETA')
})

test('fallback adapter returns realistic catalog and config data', async () => {
  const adapter = createSupabaseStorageAdapter({ supabaseUrl: '' })

  assert.equal(adapter.isConfigured, false)

  const catalog = await adapter.fetchCatalog()
  assert.ok(catalog.length >= 12)
  assert.ok(
    catalog.every(
      (kit) =>
        kit.id &&
        kit.team &&
        kit.category &&
        kit.imageUrl.startsWith('data:image/svg+xml'),
    ),
  )

  const filenames = new Set(catalog.map((kit) => kit.filename))
  assert.ok(filenames.has('SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp'))
  assert.ok(filenames.has('CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA.webp'))
  assert.ok(catalog.some((kit) => kit.isRetro))
  assert.ok(catalog.some((kit) => !kit.isRetro))

  const store = await adapter.fetchConfig('store.json')
  assert.equal(store.deliveryCity, 'Milagro')
  assert.equal(store.basePrice, 35)
  assert.equal(store.currency, 'USD')
  assert.match(store.whatsappNumber, /^\d{9,15}$/)
  assert.ok(store.infoSections.length >= 3)

  const notifications = await adapter.fetchConfig('notifications.json')
  assert.ok(Array.isArray(notifications.notifications))
  assert.ok(notifications.notifications.some((item) => item.active))

  const topPicks = await adapter.fetchConfig('top-picks.json')
  assert.ok(Array.isArray(topPicks.teams))
  assert.ok(Array.isArray(topPicks.specificFiles))

  // Fallback reads must be isolated copies.
  store.deliveryCity = 'Mutated'
  const freshStore = await adapter.fetchConfig('config/store.json')
  assert.equal(freshStore.deliveryCity, 'Milagro')
})

test('catalogAdapter facade stays usable without Vite env values', async () => {
  const catalogAdapter = await import(
    '../src/core/adapters/catalogAdapter.js'
  )

  assert.equal(catalogAdapter.isCatalogConfigured, false)

  const catalog = await catalogAdapter.fetchCatalog()
  const store = await catalogAdapter.fetchConfig('store.json')

  assert.ok(catalog.length >= 12)
  assert.equal(store.deliveryCity, 'Milagro')
})

test('configured adapter lists, maps, parses, and dedupes catalog files', async () => {
  const calls = []

  const fakeFetch = async (url, options = {}) => {
    calls.push({ url, options })

    if (url.includes('/storage/v1/object/list/')) {
      return {
        ok: true,
        status: 200,
        json: async () => [
          { name: 'SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp' },
          { name: 'catalog/CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA.webp' },
          { name: 'CLUB_REAL-MADRID_2026_LOCAL_CAMISETA.webp' },
          { name: 'CLUB_REAL-MADRID_2026_LOCAL_CAMISETA.webp' },
          { name: 'README.txt' },
        ],
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ source: url }),
    }
  }

  const adapter = createSupabaseStorageAdapter({
    supabaseUrl: 'https://demo.supabase.co/',
    supabaseAnonKey: 'test-anon-key',
    fetchImpl: fakeFetch,
    now: () => 1234567890,
  })

  assert.equal(adapter.isConfigured, true)

  const catalog = await adapter.fetchCatalog()
  assert.equal(catalog.length, 3)
  assert.equal(
    calls[0].url,
    'https://demo.supabase.co/storage/v1/object/list/tigrito-assets',
  )
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    prefix: 'catalog',
    limit: 1000,
    offset: 0,
  })

  const barcelona = catalog.find(
    (kit) => kit.id === 'CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA',
  )
  assert.equal(barcelona.team, 'Barcelona SC')
  assert.equal(
    barcelona.imageUrl,
    'https://demo.supabase.co/storage/v1/object/public/tigrito-assets/catalog/CLUB_BARCELONA-SC_2025_100-ANOS-1_CAMISETA.webp',
  )

  const config = await adapter.fetchConfig('store.json')
  assert.equal(
    config.source,
    'https://demo.supabase.co/storage/v1/object/public/tigrito-assets/config/store.json?t=1234567890',
  )
  assert.equal(
    calls[1].url,
    'https://demo.supabase.co/storage/v1/object/public/tigrito-assets/config/store.json?t=1234567890',
  )

  await assert.rejects(
    () => adapter.fetchConfig('secrets.json'),
    /Unsupported config file/,
  )
})

test('configured adapter surfaces HTTP failures', async () => {
  const adapter = createSupabaseStorageAdapter({
    supabaseUrl: 'https://demo.supabase.co',
    supabaseAnonKey: 'test-anon-key',
    fetchImpl: async () => ({ ok: false, status: 503 }),
  })

  await assert.rejects(() => adapter.fetchCatalog(), /status 503/)
  await assert.rejects(() => adapter.fetchConfig('store.json'), /status 503/)
})
