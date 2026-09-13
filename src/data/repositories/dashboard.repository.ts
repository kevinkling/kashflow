import { http, toResource } from '@/data/http'
import type { ResumenFinanciero } from '@/types/dashboard'
import type { Resource } from '@/types/sync'

export interface ResumenFinancieroParams {
  usuario_id: number
  desde: string
  hasta: string
}

export const dashboardRepository = {
  resumenFinanciero(params: ResumenFinancieroParams): Promise<Resource<ResumenFinanciero>> {
    const qs = new URLSearchParams({
      usuario_id: String(params.usuario_id),
      desde: params.desde,
      hasta: params.hasta,
    })
    return toResource(http.get<ResumenFinanciero>(`/api/planning/resumen-financiero?${qs.toString()}`))
  },
}
