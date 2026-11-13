import { createSupabaseStorageAdapter } from './supabaseStorageAdapter.js'

/**
 * Public catalog boundary for the UI. Components import this module only;
 * they never know that Supabase Storage is the current transport.
 */
const env = import.meta.env ?? {}

const storageAdapter = createSupabaseStorageAdapter({
  supabaseUrl: env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY ?? '',
  bucket: env.VITE_SUPABASE_BUCKET || 'tigrito-assets',
})

export const fetchCatalog = (...args) => storageAdapter.fetchCatalog(...args)
export const fetchConfig = (...args) => storageAdapter.fetchConfig(...args)
export const isCatalogConfigured = storageAdapter.isConfigured

export default storageAdapter
