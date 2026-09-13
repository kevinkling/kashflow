// Paridad con data/updates/006_add_financial_planning_tables.sql (tarjetas, consumos_tarjeta).
export interface Tarjeta {
  id: number
  usuario_id: number
  nombre: string
  alias: string
  dia_cierre: number
  dia_vencimiento: number
  cuenta_pago_id: number | null
  activa: 0 | 1
  fecha_creacion: string
  fecha_modificacion: string
}

export interface TarjetaPayload {
  usuario_id: number
  nombre: string
  alias: string
  dia_cierre: number
  dia_vencimiento: number
  cuenta_pago_id?: number | null
}

export interface TarjetaUpdatePayload {
  nombre?: string
  alias?: string
  dia_cierre?: number
  dia_vencimiento?: number
  cuenta_pago_id?: number | null
}

export interface CuotaConsumo {
  id: number
  consumo_id: number
  numero_cuota: number
  total_cuotas: number
  monto_cuota: number
  periodo: string
  instancia_resumen_id: number | null
}

export interface ResumenTarjetaActual {
  tarjeta: Tarjeta
  periodo: string
  desde: string
  hasta: string
  totalPendiente: number
  cuotas: CuotaConsumo[]
}

export interface ConsumoPayload {
  tarjeta_id: number
  descripcion: string
  monto: number
  fecha_compra?: string
  /** Formato 'numero/total', ej. '1/3'. Default '1/1' (consumo sin cuotas). */
  cuotas?: string
}
