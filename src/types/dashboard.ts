import type { AgendaItem } from '@/types/obligacion'

export interface GastoPorCategoria {
  categoria: string
  total: number
}

// Paridad con GET /api/planning/resumen-financiero (dashboard.service.js).
export interface ResumenFinanciero {
  saldoTotal: number
  ingresosPeriodo: number
  gastadoPeriodo: number
  comprometido: number
  disponibleReal: number
  /** Primeros 6 items de la agenda del periodo (agenda.slice(0, 6)). */
  proximosCompromisos: AgendaItem[]
  gastosPorCategoria: GastoPorCategoria[]
}
