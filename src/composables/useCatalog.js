import { computed, reactive, readonly, ref, watch } from 'vue'

import { FILTER_CONFIG } from '../config/filters.config.js'
import { fetchCatalog, fetchConfig } from '../core/adapters/catalogAdapter.js'
import {
  applyCatalogFilters,
  normalizeFilterRules,
} from '../core/filterEngine.js'

export const BATCH_SIZE = 12

function createDefaultFilters(filterRules) {
  return Object.fromEntries(
    filterRules.map(({ key, defaultValue }) => [key, defaultValue]),
  )
}

function normalizeFilename(value) {
  return String(value).split(/[\\/]/).pop().toLowerCase()
}

function resolveTopPicks(allKits, topPicks) {
  const specificFiles = Array.isArray(topPicks?.specificFiles)
    ? topPicks.specificFiles
    : []
  const teams = Array.isArray(topPicks?.teams) ? topPicks.teams : []

  const byFilename = new Map()
  const byId = new Map()

  for (const kit of allKits) {
    byFilename.set(kit.filename.toLowerCase(), kit)
    byId.set(kit.id.toLowerCase(), kit)
  }

  const picks = []
  const seen = new Set()

  function addPick(kit) {
    if (!kit || seen.has(kit.id)) return
    seen.add(kit.id)
    picks.push(kit)
  }

  // Explicit file curation keeps the order defined in top-picks.json.
  for (const file of specificFiles) {
    const filename = normalizeFilename(file)
    addPick(
      byFilename.get(filename) ??
        byId.get(filename.replace(/\.webp$/i, '')),
    )
  }

  // Team picks follow catalog order and are deduped against file picks.
  const teamSet = new Set(teams.map((team) => String(team).toLowerCase()))

  if (teamSet.size > 0) {
    for (const kit of allKits) {
      if (teamSet.has(kit.team.toLowerCase())) addPick(kit)
    }
  }

  return picks
}

/**
 * Reactive catalog state: in-memory filters, 12-item pages, dynamic teams and
 * curated top picks. Data access stays behind the catalogAdapter facade.
 */
export function useCatalog({
  fetchCatalogData = fetchCatalog,
  fetchConfigData = fetchConfig,
  filterConfig = FILTER_CONFIG,
  defaultFilters = null,
  batchSize = BATCH_SIZE,
  autoLoad = true,
} = {}) {
  const filterRules = normalizeFilterRules(filterConfig)
  const teamRule = filterRules.find((rule) => rule.key === 'team')

  const allKits = ref([])
  const storeConfig = ref(null)
  const notifications = ref([])
  const topPicks = ref({ teams: [], specificFiles: [] })
  const isLoading = ref(false)
  const error = ref(null)
  const hasLoaded = ref(false)
  const initialFilterState = Object.freeze(
    defaultFilters
      ? { ...defaultFilters }
      : createDefaultFilters(filterRules),
  )
  const filters = reactive({ ...initialFilterState })
  const visibleLimit = ref(batchSize)

  let loadPromise = null

  function resetPagination() {
    visibleLimit.value = batchSize
  }

  const availableTeams = computed(() => {
    const teams = new Set()

    for (const kit of allKits.value) {
      if (kit?.team) teams.add(kit.team)
    }

    return [...teams].sort((a, b) => a.localeCompare(b, 'es'))
  })

  const teamOptions = computed(() => {
    const allValue = teamRule?.allValue ?? 'ALL'
    const allLabel = teamRule?.allLabel ?? 'Todos los equipos'

    return [
      { value: allValue, label: allLabel },
      ...availableTeams.value.map((team) => ({ value: team, label: team })),
    ]
  })

  const filteredKits = computed(() =>
    applyCatalogFilters(allKits.value, filters, filterRules),
  )

  const visibleKits = computed(() =>
    filteredKits.value.slice(0, visibleLimit.value),
  )

  const hasMore = computed(
    () => visibleLimit.value < filteredKits.value.length,
  )

  const topPickKits = computed(() =>
    resolveTopPicks(allKits.value, topPicks.value),
  )

  // Any filter mutation resets the page synchronously, before re-render.
  watch(
    filters,
    () => {
      resetPagination()
    },
    { deep: true, flush: 'sync' },
  )

  function loadMore() {
    if (!hasMore.value) return

    visibleLimit.value += batchSize
  }

  function setFilter(key, value) {
    if (!Object.hasOwn(filters, key)) return
    filters[key] = value
  }

  function resetFilters() {
    Object.assign(filters, initialFilterState)
    resetPagination()
  }

  async function loadCatalog() {
    if (loadPromise) return loadPromise

    isLoading.value = true
    error.value = null

    loadPromise = (async () => {
      try {
        const [catalog, store, notificationsConfig, topPicksConfig] =
          await Promise.all([
            fetchCatalogData(),
            fetchConfigData('store.json'),
            fetchConfigData('notifications.json'),
            fetchConfigData('top-picks.json'),
          ])

        allKits.value = Array.isArray(catalog) ? catalog : []
        storeConfig.value = store ?? null
        notifications.value = Array.isArray(notificationsConfig?.notifications)
          ? notificationsConfig.notifications
          : []
        topPicks.value = {
          teams: Array.isArray(topPicksConfig?.teams)
            ? topPicksConfig.teams
            : [],
          specificFiles: Array.isArray(topPicksConfig?.specificFiles)
            ? topPicksConfig.specificFiles
            : [],
        }
        hasLoaded.value = true
        resetPagination()
      } catch (loadError) {
        error.value =
          loadError instanceof Error
            ? loadError
            : new Error(String(loadError))
      } finally {
        isLoading.value = false
        loadPromise = null
      }
    })()

    return loadPromise
  }

  const ready = autoLoad ? loadCatalog() : Promise.resolve()

  return {
    BATCH_SIZE: batchSize,
    allKits: readonly(allKits),
    availableTeams,
    error: readonly(error),
    filteredKits,
    filters,
    hasLoaded: readonly(hasLoaded),
    hasMore,
    isLoading: readonly(isLoading),
    loadCatalog,
    loadMore,
    notifications: readonly(notifications),
    ready,
    resetFilters,
    setFilter,
    storeConfig: readonly(storeConfig),
    teamOptions,
    topPickKits,
    topPicks: readonly(topPicks),
    visibleKits,
    visibleLimit: readonly(visibleLimit),
  }
}
