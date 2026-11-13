import test from 'node:test'
import assert from 'node:assert/strict'

import { parseCatalogFilename } from '../src/core/catalogParser.js'
import {
  FALLBACK_CATALOG,
  FALLBACK_CONFIGS,
} from '../src/core/mocks/fallbackData.js'
import { BATCH_SIZE, useCatalog } from '../src/composables/useCatalog.js'

const mockDependencies = {
  fetchCatalogData: async () => FALLBACK_CATALOG,
  fetchConfigData: async (fileName) => FALLBACK_CONFIGS[fileName],
}

test('BATCH_SIZE is 12 and loadMore advances by exactly one batch', async () => {
  const catalog = useCatalog(mockDependencies)
  await catalog.ready

  assert.equal(BATCH_SIZE, 12)
  assert.equal(catalog.allKits.value.length, FALLBACK_CATALOG.length)
  assert.equal(catalog.visibleLimit.value, 12)
  assert.equal(catalog.visibleKits.value.length, 12)
  assert.equal(catalog.hasMore.value, true)

  catalog.loadMore()

  assert.equal(catalog.visibleLimit.value, 24)
  assert.equal(catalog.visibleKits.value.length, FALLBACK_CATALOG.length)
  assert.equal(catalog.hasMore.value, false)

  catalog.loadMore()
  assert.equal(catalog.visibleLimit.value, 24)
})

test('every filter change resets pagination to 12 synchronously', async () => {
  const catalog = useCatalog(mockDependencies)
  await catalog.ready

  catalog.filters.category = 'CLUB'
  assert.equal(catalog.filteredKits.value.length, 14)
  assert.equal(catalog.visibleLimit.value, 12)

  catalog.loadMore()
  assert.equal(catalog.visibleLimit.value, 24)
  assert.equal(catalog.visibleKits.value.length, 14)

  catalog.filters.search = 'barcelona'
  assert.equal(catalog.visibleLimit.value, 12)
  assert.ok(
    catalog.filteredKits.value.every(
      (kit) =>
        kit.category === 'CLUB' &&
        kit.team.toLowerCase().includes('barcelona'),
    ),
  )

  catalog.filters.search = ''
  assert.equal(catalog.filteredKits.value.length, 14)
  catalog.loadMore()
  assert.equal(catalog.visibleLimit.value, 24)
  catalog.filters.retroOnly = true
  assert.equal(catalog.visibleLimit.value, 12)

  catalog.filters.retroOnly = false
  catalog.filters.category = 'ALL'
  assert.equal(catalog.visibleLimit.value, 12)
  catalog.loadMore()
  assert.equal(catalog.visibleLimit.value, 24)
  catalog.setFilter('team', 'Barcelona SC')
  assert.equal(catalog.visibleLimit.value, 12)

  catalog.setFilter('team', 'ALL')
  catalog.loadMore()
  assert.equal(catalog.visibleLimit.value, 24)
  catalog.resetFilters()
  assert.equal(catalog.visibleLimit.value, 12)
  assert.deepEqual(
    { ...catalog.filters },
    {
      category: 'ALL',
      retroOnly: false,
      team: 'ALL',
      search: '',
    },
  )
})

test('availableTeams is dynamic, unique, and sorted from allKits', async () => {
  const extraKit = parseCatalogFilename(
    'CLUB_NEW-TEAM_2026_LOCAL_CAMISETA.webp',
  )

  const catalog = useCatalog({
    ...mockDependencies,
    fetchCatalogData: async () => [...FALLBACK_CATALOG, extraKit],
  })
  await catalog.ready

  const teams = catalog.availableTeams.value

  assert.ok(teams.includes('New Team'))
  assert.equal(new Set(teams).size, teams.length)
  assert.deepEqual(teams, [...teams].sort((a, b) => a.localeCompare(b, 'es')))
  assert.deepEqual(catalog.teamOptions.value[0], {
    value: 'ALL',
    label: 'Todos los equipos',
  })
  assert.ok(
    catalog.teamOptions.value.some((option) => option.value === 'New Team'),
  )
})

test('topPickKits resolves specific files first and team picks second', async () => {
  const topPicks = {
    teams: ['Barcelona SC'],
    specificFiles: ['SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp'],
  }

  const catalog = useCatalog({
    ...mockDependencies,
    fetchConfigData: async (fileName) =>
      fileName === 'top-picks.json'
        ? topPicks
        : FALLBACK_CONFIGS[fileName],
  })
  await catalog.ready

  const picks = catalog.topPickKits.value

  assert.equal(
    picks[0].filename,
    'SEL_ARGENTINA_2014_LOCAL_CAMISETA.webp',
  )
  assert.ok(picks.some((kit) => kit.team === 'Barcelona SC'))
  assert.equal(new Set(picks.map((kit) => kit.id)).size, picks.length)
})

test('exposes store and notification configs after loading', async () => {
  const catalog = useCatalog(mockDependencies)
  await catalog.ready

  assert.equal(catalog.storeConfig.value.deliveryCity, 'Milagro')
  assert.ok(Array.isArray(catalog.notifications.value))
  assert.ok(catalog.notifications.value.some((item) => item.active))
  assert.equal(catalog.hasLoaded.value, true)
  assert.equal(catalog.isLoading.value, false)
  assert.equal(catalog.error.value, null)
})

test('surfaces load errors without throwing and can be loaded manually', async () => {
  const failing = useCatalog({
    fetchCatalogData: async () => {
      throw new Error('offline')
    },
    fetchConfigData: async () => ({}),
  })
  await failing.ready

  assert.equal(failing.isLoading.value, false)
  assert.equal(failing.hasLoaded.value, false)
  assert.match(failing.error.value.message, /offline/)

  const manual = useCatalog({ ...mockDependencies, autoLoad: false })

  assert.equal(manual.isLoading.value, false)
  assert.equal(manual.allKits.value.length, 0)

  await manual.loadCatalog()

  assert.equal(manual.allKits.value.length, FALLBACK_CATALOG.length)
  assert.equal(manual.hasLoaded.value, true)
})
