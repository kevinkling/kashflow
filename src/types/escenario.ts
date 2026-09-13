// Paridad con data/updates/007_add_simulation_tables.sql y
// api/shared/financeCalculations.js (calcularProyeccionSimulada).
export type TipoAjuste = 'instancia' | 'libre'

export interface Escenario {
  id: number
  usuario_id: number
  nombre: string
  fecha_creacion: string
  fecha_modificacion: string
}

export interface AjusteEscenario {
  id: number
  escenario_id: number
  tipo: TipoAjuste
  instancia_compromiso_id: number | null
  descripcion: string | null
  fecha_estimada: string | null
  monto_simulado: number
  signo: 1 | -1
}

export interface AjusteInstanciaPayload {
  tipo: 'instancia'
  instancia_compromiso_id: number
  descripcion?: string
  fecha_estimada?: string
  monto_simulado: number
  signo?: 1 | -1
}

export interface AjusteLibrePayload {
  tipo: 'libre'
  descripcion: string
  fecha_estimada?: string
  monto_simulado: number
  signo: 1 | -1
}

export interface SaldoSimulado {
  saldoReal: number
  expectedTotal: number
  lineasLibresTotal: number
  saldoSimulado: number
}

export interface ProyeccionMensual extends SaldoSimulado {
  periodo: string
  desde: string
  hasta: string
  saldoBase: number
  delta: number
}
