import { defineStore } from 'pinia'

import { simuladorRepository } from '@/data/repositories/simulador.repository'
import type { AjusteEscenario, AjusteInstanciaPayload, AjusteLibrePayload, Escenario, ProyeccionMensual } from '@/types/escenario'
import { createIdleResource, type Resource } from '@/types/sync'

export const useSimuladorStore = defineStore('simulador', {
  state: () => ({
    escenarios: createIdleResource<Escenario[]>() as Resource<Escenario[]>,
    ajustes: createIdleResource<AjusteEscenario[]>() as Resource<AjusteEscenario[]>,
    proyeccion: createIdleResource<ProyeccionMensual[]>() as Resource<ProyeccionMensual[]>,
    escenarioActualId: null as number | null,
  }),
  actions: {
    async refreshEscenarios(usuarioId: number) {
      this.escenarios = { ...this.escenarios, status: 'loading' }
      this.escenarios = await simuladorRepository.listarEscenarios(usuarioId)
    },
    async crearEscenario(payload: { usuario_id: number; nombre: string }) {
      const result = await simuladorRepository.crearEscenario(payload)
      if (result.status === 'ready') await this.refreshEscenarios(payload.usuario_id)
      return result
    },
    async refreshAjustes(escenarioId: number) {
      this.escenarioActualId = escenarioId
      this.ajustes = { ...this.ajustes, status: 'loading' }
      this.ajustes = await simuladorRepository.listarAjustes(escenarioId)
    },
    async agregarAjuste(escenarioId: number, payload: AjusteInstanciaPayload | AjusteLibrePayload) {
      const result = await simuladorRepository.agregarAjuste(escenarioId, payload)
      if (result.status === 'ready') await this.refreshAjustes(escenarioId)
      return result
    },
    async eliminarAjuste(escenarioId: number, ajusteId: number) {
      const result = await simuladorRepository.eliminarAjuste(escenarioId, ajusteId)
      if (result.status === 'ready') await this.refreshAjustes(escenarioId)
      return result
    },
    async refreshProyeccion(escenarioId: number, params: { meses?: number; usuario_id?: number } = {}) {
      this.proyeccion = { ...this.proyeccion, status: 'loading' }
      this.proyeccion = await simuladorRepository.proyeccionMensual(escenarioId, params)
    },
  },
})
