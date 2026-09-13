import { defineStore } from 'pinia'

import { type AgendaParams, obligacionesRepository } from '@/data/repositories/obligaciones.repository'
import { useMovimientosStore } from '@/stores/movimientos'
import type {
  AgendaItem,
  CompraEnCuotasPayload,
  CompromisoPayload,
  ConfirmarPagoPayload,
  ObligacionUpdatePayload,
  SincronizarMesPayload,
} from '@/types/obligacion'
import { createIdleResource, type Resource } from '@/types/sync'

export const useObligacionesStore = defineStore('obligaciones', {
  state: () => ({
    agenda: createIdleResource<AgendaItem[]>() as Resource<AgendaItem[]>,
    lastAgendaParams: null as AgendaParams | null,
  }),
  actions: {
    async refreshAgenda(params: AgendaParams) {
      this.lastAgendaParams = params
      this.agenda = { ...this.agenda, status: 'loading' }
      this.agenda = await obligacionesRepository.agenda(params)
      return this.agenda
    },
    async refreshAgendaIfLoaded() {
      if (this.lastAgendaParams) await this.refreshAgenda(this.lastAgendaParams)
    },
    async sincronizarMes(payload: SincronizarMesPayload) {
      const result = await obligacionesRepository.sincronizarMes(payload)
      if (result.status === 'ready') await this.refreshAgendaIfLoaded()
      return result
    },
    async crearCompromiso(payload: CompromisoPayload) {
      const result = await obligacionesRepository.crearCompromiso(payload)
      if (result.status === 'ready') await this.refreshAgendaIfLoaded()
      return result
    },
    async crearCompra(payload: CompraEnCuotasPayload) {
      const result = await obligacionesRepository.crearCompra(payload)
      if (result.status === 'ready') await this.refreshAgendaIfLoaded()
      return result
    },
    async actualizarInstancia(id: number, payload: ObligacionUpdatePayload) {
      const result = await obligacionesRepository.actualizarInstancia(id, payload)
      if (result.status === 'ready') await this.refreshAgendaIfLoaded()
      return result
    },
    async eliminarInstancia(id: number) {
      const result = await obligacionesRepository.eliminarInstancia(id)
      if (result.status === 'ready') await this.refreshAgendaIfLoaded()
      return result
    },
    /** Paridad: confirmar pago -> movimientos + obligaciones + dashboard. */
    async confirmarPago(id: number, payload: ConfirmarPagoPayload) {
      const result = await obligacionesRepository.confirmarPago(id, payload)
      if (result.status === 'ready') {
        await this.refreshAgendaIfLoaded()
        void useMovimientosStore().refresh()
      }
      return result
    },
  },
})
