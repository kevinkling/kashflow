import { defineStore } from 'pinia'

// Paridad con public/js/core/theme.js (sin particles.js). Persiste en 'kf:theme', sincroniza meta theme-color y favicon 32/192,
// y setea document.documentElement.dataset.theme (consumido por las CSS vars de main.css).

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'kf:theme'

function readSavedTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function updateMeta(theme: Theme) {
  try {
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', theme === 'dark' ? '#09090b' : '#f4f4f5')

    const fav32 = document.querySelector('link[rel="icon"][sizes="32x32"]')
    fav32?.setAttribute('href', theme === 'dark' ? '/icons/favicon-32.png' : '/icons/favicon-32-light.png')

    const fav192 = document.querySelector('link[rel="icon"][sizes="192x192"]')
    fav192?.setAttribute('href', theme === 'dark' ? '/icons/icon-192.png' : '/icons/icon-192-light.png')
  } catch {
    /* noop: document no disponible o selector ausente */
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: readSavedTheme(),
  }),
  getters: {
    isDark: (state) => state.theme === 'dark',
  },
  actions: {
    /** Aplica el tema al DOM. Se llama al iniciar la app y en cada cambio. */
    apply(theme: Theme) {
      this.theme = theme
      try {
        document.documentElement.dataset.theme = theme
        document.documentElement.classList.toggle('dark', theme === 'dark')
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {
        /* noop */
      }
      updateMeta(theme)
    },
    toggle() {
      this.apply(this.theme === 'dark' ? 'light' : 'dark')
    },
    /** Sincroniza el DOM con el estado inicial leido de localStorage (el preflight de index.html ya lo aplico). */
    init() {
      this.apply(this.theme)
    },
  },
})
