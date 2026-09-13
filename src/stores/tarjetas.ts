import { defineStore } from 'pinia'

import { tarjetasRepository } from '@/data/repositories/tarjetas.repository'
import type { ConsumoPayload, Tarjeta, TarjetaPayload, TarjetaUpdatePayload } from '@/types/tarjeta'
import { createIdleResource, type Resource } from '@/types/sync'

export const useTarjetasStore = defineStore('tarjetas', {
  state: () => ({
    tarjetas: createIdleResource<Tarjeta[]>() as Resource<Tarjeta[]>,
    lastUsuarioId: null as number | null,
  }),
  actions: {
    async refresh(usuarioId?: number) {
      const id = usuarioId ?? this.lastUsuarioId
      if (!id) return
      this.lastUsuarioId = id
      this.tarjetas = { ...this.tarjetas, status: 'loading' }
      this.tarjetas = await tarjetasRepository.listar(id)
    },
    async crear(payload: TarjetaPayload) {
      const result = await tarjetasRepository.crear(payload)
      if (result.status === 'ready') await this.refresh()
      return result
    },
    async actualizar(id: number, payload: TarjetaUpdatePayload) {
      const result = await tarjetasRepository.actualizar(id, payload)
      if (result.status === 'ready') await this.refresh()
      return result
    },
    async archivar(id: number) {
      const result = await tarjetasRepository.archivar(id)
      if (result.status === 'ready') await this.refresh()
      return result
    },
    resumenActual(id: number, params: { usuario_id: number; year?: number; month?: number }) {
      return tarjetasRepository.resumenActual(id, params)
    },
    async registrarConsumo(payload: ConsumoPayload) {
      return tarjetasRepository.registrarConsumo(payload)
    },
  },
})
