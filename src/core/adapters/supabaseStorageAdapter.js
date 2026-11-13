import { parseCatalogFilename } from '../catalogParser.js'
import { FALLBACK_CATALOG, FALLBACK_CONFIGS } from '../mocks/fallbackData.js'

export const DEFAULT_BUCKET = 'tigrito-assets'
export const CATALOG_PREFIX = 'catalog/'
export const CONFIG_FILES = Object.freeze([
  'store.json',
  'notifications.json',
  'top-picks.json',
])

const CONFIG_FILE_SET = new Set(CONFIG_FILES)
const LIST_LIMIT = 1000

function normalizeSupabaseUrl(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

function normalizeConfigFileName(fileName) {
  if (typeof fileName !== 'string') return null

  const normalized = fileName.trim().replace(/^config\//i, '').toLowerCase()
  return CONFIG_FILE_SET.has(normalized) ? normalized : null
}

function extractFileName(value) {
  if (typeof value !== 'string') return ''
  return value.trim().split(/[\\/]/).pop()
}

function cloneValue(value) {
  if (value === undefined) return undefined
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

function assertOk(response, operation) {
  if (!response || response.ok !== true) {
    const status = response?.status ?? 'unknown'
    throw new Error(`${operation} failed with status ${status}.`)
  }
}

/**
 * Create a Supabase Storage adapter with no dependency on the DOM, Vue, or
 * Vite env. The composition root (catalogAdapter.js) injects configuration.
 */
export function createSupabaseStorageAdapter({
  supabaseUrl = '',
  supabaseAnonKey = '',
  bucket = DEFAULT_BUCKET,
  fetchImpl = globalThis.fetch,
  fallbackCatalog = FALLBACK_CATALOG,
  fallbackConfigs = FALLBACK_CONFIGS,
  now = () => Date.now(),
} = {}) {
  const baseUrl = normalizeSupabaseUrl(supabaseUrl)
  const normalizedBucket =
    typeof bucket === 'string' && bucket.trim() ? bucket.trim() : DEFAULT_BUCKET
  const anonKey = typeof supabaseAnonKey === 'string' ? supabaseAnonKey.trim() : ''
  const isConfigured = baseUrl.length > 0 && anonKey.length > 0

  if (typeof fetchImpl !== 'function') {
    throw new TypeError('A fetch implementation is required.')
  }

  function buildPublicUrl(path) {
    return `${baseUrl}/storage/v1/object/public/${encodeURIComponent(normalizedBucket)}/${path}`
  }

  async function fetchCatalog() {
    if (!isConfigured) {
      return cloneValue(fallbackCatalog)
    }

    const endpoint = `${baseUrl}/storage/v1/object/list/${encodeURIComponent(normalizedBucket)}`
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        prefix: 'catalog',
        limit: LIST_LIMIT,
        offset: 0,
      }),
    })

    assertOk(response, 'Catalog listing')

    const payload = await response.json()
    const entries = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : null

    if (!entries) {
      throw new Error('Catalog listing returned an unexpected payload.')
    }

    // The list endpoint may include the prefix in `name`; normalize and dedupe.
    const files = new Map()
    for (const entry of entries) {
      const fileName = extractFileName(entry?.name)
      if (!fileName || !fileName.toLowerCase().endsWith('.webp')) continue
      files.set(fileName, entry)
    }

    return [...files.keys()]
      .map((fileName) => {
        const imageUrl = buildPublicUrl(
          `${CATALOG_PREFIX}${encodeURIComponent(fileName)}`,
        )
        return parseCatalogFilename(fileName, imageUrl)
      })
      .filter(Boolean)
      .sort((a, b) => a.filename.localeCompare(b.filename))
  }

  async function fetchConfig(fileName) {
    const configName = normalizeConfigFileName(fileName)

    if (!configName) {
      throw new Error(`Unsupported config file: ${String(fileName)}`)
    }

    if (!isConfigured) {
      if (!(configName in fallbackConfigs)) {
        throw new Error(`No fallback available for config file: ${configName}`)
      }

      return cloneValue(fallbackConfigs[configName])
    }

    const configUrl = `${buildPublicUrl(
      `config/${encodeURIComponent(configName)}`,
    )}?t=${now()}`

    const response = await fetchImpl(configUrl, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    assertOk(response, `Config "${configName}"`)

    return response.json()
  }

  return Object.freeze({
    bucket: normalizedBucket,
    isConfigured,
    fetchCatalog,
    fetchConfig,
  })
}
