import {
  computed,
  getCurrentScope,
  onScopeDispose,
  readonly,
  ref,
} from 'vue'

import { adminStorageAdapter } from '../core/adapters/adminStorageAdapter.js'

function toAuthError(error) {
  if (error instanceof Error) return error
  return new Error(
    typeof error?.message === 'string'
      ? error.message
      : 'Unknown authentication error.',
  )
}

function resolveUser(value) {
  if (!value) return null
  if (value.user !== undefined) return value.user ?? null
  if (value.session !== undefined) return value.session?.user ?? null
  return value
}

/**
 * Reactive admin auth state. Components consume this composable only; the
 * Supabase SDK stays behind adminStorageAdapter.
 */
export function useAdminAuth({
  adapter = adminStorageAdapter,
  autoRestore = true,
} = {}) {
  const user = ref(null)
  const authLoading = ref(false)
  const authError = ref(null)

  let unsubscribe = null
  let disposed = false

  const isAuthenticated = computed(() => Boolean(user.value))

  function stopAuthListener() {
    if (typeof unsubscribe === 'function') unsubscribe()
    unsubscribe = null
  }

  function applyUser(nextUser) {
    user.value = nextUser ?? null
  }

  function handleAuthChange(payload) {
    if (disposed) return

    const nextUser = resolveUser(payload)

    if (payload?.event === 'SIGNED_OUT') {
      applyUser(null)
      authError.value = null
      return
    }

    if (nextUser) {
      applyUser(nextUser)
      authError.value = null
    }
  }

  function startAuthListener() {
    if (unsubscribe || typeof adapter.onAdminAuthChange !== 'function') return

    try {
      const stop = adapter.onAdminAuthChange(handleAuthChange)

      if (typeof stop === 'function') {
        unsubscribe = stop
      } else if (typeof stop?.unsubscribe === 'function') {
        unsubscribe = () => stop.unsubscribe()
      }
    } catch (error) {
      authError.value = toAuthError(error)
    }
  }

  async function restoreSession() {
    authLoading.value = true
    authError.value = null

    try {
      const session = await adapter.getAdminSession()
      applyUser(session?.user ?? null)
      return session
    } catch (error) {
      authError.value = toAuthError(error)
      applyUser(null)
      return null
    } finally {
      authLoading.value = false
    }
  }

  async function login(email, password) {
    authLoading.value = true
    authError.value = null

    try {
      const result = await adapter.signInAdmin(email, password)
      const nextUser = resolveUser(result)
      applyUser(nextUser)
      return nextUser
    } catch (error) {
      authError.value = toAuthError(error)
      applyUser(null)
      return null
    } finally {
      authLoading.value = false
    }
  }

  async function logout() {
    authLoading.value = true
    authError.value = null

    try {
      await adapter.signOutAdmin()
      applyUser(null)
      return true
    } catch (error) {
      authError.value = toAuthError(error)
      return false
    } finally {
      authLoading.value = false
    }
  }

  startAuthListener()

  const ready = autoRestore ? restoreSession() : Promise.resolve(null)

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
      stopAuthListener()
    })
  }

  return {
    user: readonly(user),
    isAuthenticated,
    authLoading: readonly(authLoading),
    authError: readonly(authError),
    login,
    logout,
    restoreSession,
    ready,
    stopAuthListener,
  }
}

export default useAdminAuth
