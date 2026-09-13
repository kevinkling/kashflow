import { defineStore } from 'pinia'

import { cuentasRepository } from '@/data/repositories/cuentas.repository'
import { useMovimientosStore } from '@/stores/movimientos'
import { useTarjetasStore } from '@/stores/tarjetas'
import type { Cuenta, CuentaPayload, CuentaUpdatePayload } from '@/types/cuenta'
import { createIdleResource, type Resource } from '@/types/sync'

export const useCuentasStore = defineStore('cuentas', {
  state: () => ({
    cuentas: createIdleResource<Cuenta[]>() as Resource<Cuenta[]>,
    /** vista_saldos_cuentas_admin (incluye inactivas), para la gestion de cuentas. */
    cuentasGestion: createIdleResource<Cuenta[]>() as Resource<Cuenta[]>,
  }),
  actions: {
    async refresh() {
      this.cuentas = { ...this.cuentas, status: 'loading' }
      this.cuentas = await cuentasRepository.listar()
    },
    async refreshGestion() {
      this.cuentasGestion = { ...this.cuentasGestion, status: 'loading' }
      this.cuentasGestion = await cuentasRepository.listarGestion()
    },
    async crear(payload: CuentaPayload) {
      const result = await cuentasRepository.crear(payload)
      if (result.status === 'ready') await this.afterMutate()
      return result
    },
    async actualizar(id: number, payload: CuentaUpdatePayload) {
      const result = await cuentasRepository.actualizar(id, payload)
      if (result.status === 'ready') await this.afterMutate()
      return result
    },
    async toggle(id: number) {
      const result = await cuentasRepository.toggle(id)
      if (result.status === 'ready') await this.afterMutate()
      return result
    },
    /**
     * Paridad con KF.emit('kf:cuentas-changed') del store.js viejo: refresca cuentas
     * (saldos), los selects de movimientos y el nombre de cuenta de pago en tarjetas.
     */
    async afterMutate() {
      await Promise.all([this.refresh(), this.refreshGestion()])
      void useMovimientosStore().refresh()
      void useTarjetasStore().refresh()
    },
  },
})
