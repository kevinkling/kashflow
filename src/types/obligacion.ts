// Paridad con data/updates/006_add_financial_planning_tables.sql (compromisos,
// instancias_compromiso) y api/domains/obligaciones/obligaciones.repository.js (obtenerAgenda).
export type TipoCompromiso = 'ingreso' | 'egreso'
export type FrecuenciaCompromiso = 'unica' | 'mensual' | 'quincenal' | 'anual'
export type EstadoInstancia = 'pendiente' | 'vencido' | 'pagado' | 'cancelado'

export interface Compromiso {
  id: number
  usuario_id: number
  nombre: string
  tipo: TipoCompromiso
  frecuencia: FrecuenciaCompromiso
  dia_vencimiento: number | null
  importe_estimado: number
  cuenta_sugerida_id: number | null
  activa: 0 | 1
  total_cuotas: number | null
  es_compra: 0 | 1
  tarjeta_id: number | null
  es_variable: 0 | 1
  fecha_creacion: string
  fecha_modificacion: string
}

/** Fila de GET /api/planning/agenda (instancias_compromiso + join compromisos/cuentas/tarjetas). */
export interface AgendaItem {
  id: number
  compromiso_id: number | null
  usuario_id: number
  descripcion: string
  periodo: string | null
  fecha_vencimiento: string
  importe_esperado: number
  importe_final: number | null
  estado: EstadoInstancia
  cuenta_pago_id: number | null
  transaccion_id: number | null
  compromiso_nombre: string | null
  compromiso_tipo: TipoCompromiso | null
  frecuencia: FrecuenciaCompromiso | null
  compromiso_total_cuotas: number | null
  compromiso_es_variable: 0 | 1 | null
  cuenta_alias: string | null
  tarjeta_id: number | null
  tarjeta_nombre: string | null
}

export interface CompromisoPayload {
  usuario_id: number
  nombre: string
  tipo: TipoCompromiso
  frecuencia: FrecuenciaCompromiso
  dia_vencimiento?: number | null
  importe_estimado: number
  cuenta_sugerida_id?: number | null
  es_variable?: boolean
}

export interface CompraEnCuotasPayload {
  usuario_id: number
  nombre: string
  monto_total: number
  total_cuotas?: number
  tarjeta_id?: number | null
  cuenta_sugerida_id?: number | null
}

export interface ObligacionUpdatePayload {
  descripcion?: string
  fecha_vencimiento?: string
  importe_esperado?: number
  cuenta_pago_id?: number | null
  estado?: EstadoInstancia
  /** Atributo del compromiso, no de la instancia puntual (ver obligaciones.service.js). */
  tipo?: TipoCompromiso
  es_variable?: boolean
}

export interface ConfirmarPagoPayload {
  cuenta_pago_id: number
  monto_final: number
  descripcion?: string
}

export interface SincronizarMesPayload {
  usuario_id: number
  year?: number
  month?: number
}

export interface SincronizarMesResult {
  instancias_creadas: number[]
  resumenes_generados: unknown[]
  instancias_huerfanas_eliminadas: number
}
