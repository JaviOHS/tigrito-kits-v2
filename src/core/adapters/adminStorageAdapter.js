import { createClient } from '@supabase/supabase-js'

import { parseCatalogFilename } from '../catalogParser.js'
import { CONFIG_FILES, DEFAULT_BUCKET } from '../storageConfig.js'

export { CONFIG_FILES, DEFAULT_BUCKET }

const CONFIG_FILE_SET = new Set(CONFIG_FILES)

function normalizeSupabaseUrl(value) {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

function normalizeBucket(value) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_BUCKET
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

function normalizeCatalogFileName(fileName) {
  const baseName = extractFileName(fileName)
  return parseCatalogFilename(baseName) ? baseName : null
}

function assertUploadResult({ data, error }, operation) {
  if (error) throw error
  if (!data) throw new Error(`${operation} returned no data.`)
  return data
}

function assertNoError({ error }) {
  if (error) throw error
}

function normalizeWebpBlob(blob) {
  if (typeof Blob === 'undefined' || !(blob instanceof Blob)) return blob
  if (blob.type === 'image/webp') return blob

  return new Blob([blob], { type: 'image/webp' })
}

/**
 * Authenticated Supabase boundary for the future admin panel. UI components
 * import the composable only; Supabase remains an implementation detail here.
 *
 * A client can be injected for tests. Otherwise it is created lazily from the
 * injected URL/key, or from `import.meta.env` by the default export below.
 */
export function createAdminStorageAdapter({
  supabaseUrl = '',
  supabaseAnonKey = '',
  bucket = DEFAULT_BUCKET,
  client = null,
  createClientImpl = createClient,
} = {}) {
  const baseUrl = normalizeSupabaseUrl(supabaseUrl)
  const anonKey =
    typeof supabaseAnonKey === 'string' ? supabaseAnonKey.trim() : ''
  const normalizedBucket = normalizeBucket(bucket)
  const isConfigured =
    Boolean(client) || (baseUrl.length > 0 && anonKey.length > 0)

  let supabase = client

  function getClient() {
    if (supabase) return supabase

    if (!isConfigured) {
      throw new Error(
        'Supabase admin client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      )
    }

    if (typeof createClientImpl !== 'function') {
      throw new TypeError('A Supabase createClient implementation is required.')
    }

    supabase = createClientImpl(baseUrl, anonKey)
    return supabase
  }

  function getStorage() {
    return getClient().storage.from(normalizedBucket)
  }

  async function signInAdmin(email, password) {
    const { data, error } = await getClient().auth.signInWithPassword({
      email,
      password,
    })

    assertNoError({ error })

    return data?.user ?? data?.session?.user ?? null
  }

  async function signOutAdmin() {
    const { error } = await getClient().auth.signOut()

    assertNoError({ error })

    return true
  }

  async function getAdminSession() {
    const { data, error } = await getClient().auth.getSession()

    assertNoError({ error })

    return data?.session ?? null
  }

  function onAdminAuthChange(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('An auth change callback is required.')
    }

    const { data } = getClient().auth.onAuthStateChange((event, session) => {
      return callback({
        event,
        session,
        user: session?.user ?? null,
      })
    })

    return () => data?.subscription?.unsubscribe()
  }

  async function saveConfigJson(fileName, jsonString) {
    const configName = normalizeConfigFileName(fileName)

    if (!configName) {
      throw new Error(`Unsupported config file: ${String(fileName)}`)
    }

    if (typeof jsonString !== 'string') {
      throw new TypeError('Config JSON must be provided as a string.')
    }

    // Parse locally first: malformed JSON must never reach the network.
    let parsed

    try {
      parsed = JSON.parse(jsonString)
    } catch {
      throw new Error(`Invalid JSON for config file: ${configName}`)
    }

    const formattedJson = `${JSON.stringify(parsed, null, 2)}\n`
    const { data, error } = await getStorage().upload(
      `config/${configName}`,
      formattedJson,
      {
        contentType: 'application/json',
        cacheControl: '0',
        upsert: true,
      },
    )

    return assertUploadResult(
      { data, error },
      `Config upload "${configName}"`,
    )
  }

  async function uploadCatalogImage(finalFilename, webpBlob) {
    const fileName = normalizeCatalogFileName(finalFilename)

    if (!fileName) {
      throw new Error(`Invalid catalog filename: ${String(finalFilename)}`)
    }

    if (webpBlob == null) {
      throw new TypeError('A WebP image blob is required.')
    }

    const { data, error } = await getStorage().upload(
      `catalog/${fileName}`,
      normalizeWebpBlob(webpBlob),
      {
        contentType: 'image/webp',
        upsert: true,
      },
    )

    return assertUploadResult(
      { data, error },
      `Catalog image upload "${fileName}"`,
    )
  }

  async function deleteCatalogImage(filename) {
    const fileName = normalizeCatalogFileName(filename)

    if (!fileName) {
      throw new Error(`Invalid catalog filename: ${String(filename)}`)
    }

    const { data, error } = await getStorage().remove([`catalog/${fileName}`])

    assertNoError({ error })

    return data
  }

  return Object.freeze({
    bucket: normalizedBucket,
    isConfigured,
    signInAdmin,
    signOutAdmin,
    getAdminSession,
    onAdminAuthChange,
    saveConfigJson,
    uploadCatalogImage,
    deleteCatalogImage,
  })
}

const env = import.meta.env ?? {}

export const adminStorageAdapter = createAdminStorageAdapter({
  supabaseUrl: env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? '',
  bucket: env.VITE_SUPABASE_BUCKET || DEFAULT_BUCKET,
})

export const signInAdmin = (...args) => adminStorageAdapter.signInAdmin(...args)
export const signOutAdmin = (...args) => adminStorageAdapter.signOutAdmin(...args)
export const getAdminSession = (...args) =>
  adminStorageAdapter.getAdminSession(...args)
export const onAdminAuthChange = (...args) =>
  adminStorageAdapter.onAdminAuthChange(...args)
export const saveConfigJson = (...args) =>
  adminStorageAdapter.saveConfigJson(...args)
export const uploadCatalogImage = (...args) =>
  adminStorageAdapter.uploadCatalogImage(...args)
export const deleteCatalogImage = (...args) =>
  adminStorageAdapter.deleteCatalogImage(...args)

export default adminStorageAdapter
