import { computed, readonly, ref } from 'vue'

export const THEMES = Object.freeze({
  LIGHT: 'paper-light',
  DARK: 'slate-dark',
})

export const THEME_STORAGE_KEY = 'tigrito-kitlab-theme'

const DEFAULT_THEME = THEMES.LIGHT
const AVAILABLE_THEMES = new Set(Object.values(THEMES))

const currentTheme = ref(DEFAULT_THEME)

let initialized = false
let storageListenerBound = false

function isTheme(value) {
  return typeof value === 'string' && AVAILABLE_THEMES.has(value)
}

function readStoredTheme() {
  if (typeof window === 'undefined') return null

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(storedTheme) ? storedTheme : null
  } catch {
    return null
  }
}

function persistTheme(theme) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (private mode, restricted iframe).
    // The theme still applies for the current session.
  }
}

function applyTheme(theme) {
  currentTheme.value = theme

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}

function syncThemeFromStorage(event) {
  if (event.key !== THEME_STORAGE_KEY || !isTheme(event.newValue)) return

  applyTheme(event.newValue)
}

function ensureStorageSync() {
  if (storageListenerBound || typeof window === 'undefined') return

  window.addEventListener('storage', syncThemeFromStorage)
  storageListenerBound = true
}

/**
 * Apply the persisted theme (or the paper-light default) to the document.
 * Call once from main.js before mounting to avoid a flash of the wrong theme.
 */
export function initTheme() {
  if (initialized) return currentTheme.value

  applyTheme(readStoredTheme() ?? DEFAULT_THEME)
  ensureStorageSync()
  initialized = true

  return currentTheme.value
}

export function setTheme(theme) {
  if (!isTheme(theme)) return

  applyTheme(theme)
  persistTheme(theme)
}

export function toggleTheme() {
  const nextTheme =
    currentTheme.value === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK

  setTheme(nextTheme)

  return nextTheme
}

export function useTheme() {
  initTheme()

  return {
    theme: readonly(currentTheme),
    isDark: computed(() => currentTheme.value === THEMES.DARK),
    themes: THEMES,
    setTheme,
    toggleTheme,
  }
}
