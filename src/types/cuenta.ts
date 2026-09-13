// Forma real de vista_saldos_cuentas / vista_saldos_cuentas_admin (data/schema.sql +
// data/updates/005_vistas_gestion_cuentas.sql), NO la de project_brief.md (desactualizado).
export interface Cuenta {
  cuenta_id: number
  usuario_id: number
  usuario: string
  cuenta: string
  alias: string
  color: string
  moneda: string
  /** Solo presente cuando se pide /api/cuentas?gestion=true (vista admin, incluye inactivas). */
  activa?: 0 | 1
  saldo_actual: number
  cantidad_transacciones: number
}

/** Forma real de GET /api/cuentas/:id (fila cruda de la tabla `cuentas`, no la vista de saldos). */
export interface CuentaDetalle {
  id: number
  usuario_id: number
  nombre: string
  alias: string
  color: string
  moneda: string
  activa: 0 | 1
  fecha_creacion?: string
}

export interface CuentaPayload {
  usuario_id: number
  nombre: string
  alias: string
  color?: string
  moneda?: string
}

export interface CuentaUpdatePayload {
  nombre?: string
  alias?: string
  color?: string
  moneda?: string
  activa?: boolean
}

export interface CuentaCreadaResponse {
  message: string
  cuenta: { usuario_id: number; nombre: string; alias: string; color: string; moneda: string }
}

export interface CuentaActualizadaResponse {
  message: string
  cuenta: { id: number; nombre?: string; alias?: string; color?: string; moneda?: string; activa?: boolean }
}

export interface CuentaToggleResponse {
  message: string
  activa: boolean
}
