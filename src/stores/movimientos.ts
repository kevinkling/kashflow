import { defineStore } from 'pinia'

import { movimientosRepository } from '@/data/repositories/movimientos.repository'
import { useCuentasStore } from '@/stores/cuentas'
import type { Movimiento, MovimientoCreatePayload, MovimientoUpdatePayload, TransferenciaPayload } from '@/types/movimiento'
import { createIdleResource, type Resource } from '@/types/sync'

export const useMovimientosStore = defineStore('movimientos', {
  state: () => ({
    movimientos: createIdleResource<Movimiento[]>() as Resource<Movimiento[]>,
  }),
  actions: {
    async refresh() {
      this.movimientos = { ...this.movimientos, status: 'loading' }
      this.movimientos = await movimientosRepository.listar()
    },
    async crear(payload: MovimientoCreatePayload) {
      const result = await movimientosRepository.crear(payload)
      if (result.status === 'ready') await this.afterMutate()
      return result
    },
    async actualizar(id: number, payload: MovimientoUpdatePayload) {
      const result = await movimientosRepository.actualizar(id, payload)
      if (result.status === 'ready') await this.afterMutate()
      return result
    },
    async eliminar(id: number) {
      const result = await movimientosRepository.eliminar(id)
      if (result.status === 'ready') await this.afterMutate()
      return result
    },
    async transferir(payload: TransferenciaPayload) {
      const result = await movimientosRepository.transferir(payload)
      if (result.status === 'ready') await this.afterMutate()
      return result
    },
    /**
     * Paridad con KF.emit('kf:movimientos-changed'): refresca movimientos + saldos de
     * cuentas. El dashboard (Fase 5) refetchea mirando updatedAt de ambos stores.
     */
    async afterMutate() {
      await Promise.all([this.refresh(), useCuentasStore().refresh()])
    },
  },
})
