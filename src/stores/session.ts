import { defineStore } from 'pinia'

import type { Usuario } from '@/types/usuario'

// Paridad con public/js/core/store.js. La carga de cuentas por usuario se muda a
// stores/cuentas.ts en la Fase 4 (capa de datos); este store solo resuelve
// "quien es el usuario activo", igual que el KF.store viejo.

const STORAGE_KEY = 'kf:usuarioId'

function readSavedUsuarioId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

function persistUsuarioId(id: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(id))
  } catch {
    /* noop */
  }
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    usuarios: [] as Usuario[],
    usuarioId: readSavedUsuarioId() as number | null,
    ready: false,
  }),
  actions: {
    async refreshUsuarios() {
      try {
        const res = await fetch('/api/cuentas/usuarios')
        this.usuarios = res.ok ? ((await res.json()) as Usuario[]) : []

        const saved = readSavedUsuarioId()
        if (saved && this.usuarios.some((u) => Number(u.id) === saved)) {
          this.usuarioId = saved
        } else if (this.usuarios.length) {
          this.usuarioId = Math.min(...this.usuarios.map((u) => Number(u.id)))
          persistUsuarioId(this.usuarioId)
        }
      } catch (err) {
        console.error('Error cargando usuarios', err)
        this.usuarios = []
      }
    },
    async setUsuario(id: number | string) {
      const next = Number(id)
      if (!next || next === this.usuarioId) return this.usuarioId
      this.usuarioId = next
      persistUsuarioId(next)
      return this.usuarioId
    },
    async init() {
      if (this.ready) return
      await this.refreshUsuarios()
      this.ready = true
    },
  },
})
