// Forma real de la respuesta de GET /api/movimientos (mapearMovimiento() en
// api/domains/movimientos/movimientos.service.js), no la tabla `transacciones` cruda.
export type TipoMovimiento = 'debe' | 'haber'

export interface Movimiento {
  id: number
  fecha: string
  descripcion: string
  account_id: number
  banco: string
  banco_nombre: string
  banco_color: string
  banco_destino: string | null
  cuenta_origen_id: number | null
  cuenta_destino_id: number | null
  categoria_id: number | null
  transferencia_id: number | null
  /** Ya viene con signo aplicado (monto * signo): positivo o negativo segun tipo. */
  monto: number
  debeHaber: TipoMovimiento
}

export interface MovimientoCreatePayload {
  cuenta_id: number
  tipo: TipoMovimiento
  monto: number
  descripcion: string
  categoria_id?: number | null
}

export interface MovimientoUpdatePayload {
  cuenta_id: number
  tipo: TipoMovimiento | 'transferencia'
  monto: number
  descripcion: string
  categoria_id?: number | null
  fecha?: string | null
  /** Requerida cuando tipo === 'transferencia'. */
  cuenta_destino_id?: number
}

export interface TransferenciaPayload {
  cuenta_origen_id: number
  cuenta_destino_id: number
  monto: number
  descripcion?: string
}
