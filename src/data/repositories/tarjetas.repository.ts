import { http, toResource } from '@/data/http'
import type {
  ConsumoPayload,
  ResumenTarjetaActual,
  Tarjeta,
  TarjetaPayload,
  TarjetaUpdatePayload,
} from '@/types/tarjeta'
import type { Resource } from '@/types/sync'

export interface ResumenActualParams {
  usuario_id: number
  year?: number
  month?: number
}

// Solo los metodos que el UI usa hoy. POST /tarjetas/:id/resumen y GET /consumos existen
// en la API pero ningun view los llama.
export const tarjetasRepository = {
  listar(usuarioId: number): Promise<Resource<Tarjeta[]>> {
    return toResource(http.get<Tarjeta[]>(`/api/planning/tarjetas?usuario_id=${usuarioId}`))
  },
  crear(payload: TarjetaPayload): Promise<Resource<{ id: number }>> {
    return toResource(http.post<{ id: number }>('/api/planning/tarjetas', payload))
  },
  actualizar(id: number, payload: TarjetaUpdatePayload): Promise<Resource<Tarjeta>> {
    return toResource(http.put<Tarjeta>(`/api/planning/tarjetas/${id}`, payload))
  },
  archivar(id: number): Promise<Resource<{ ok: true }>> {
    return toResource(http.delete<{ ok: true }>(`/api/planning/tarjetas/${id}`))
  },
  resumenActual(id: number, params: ResumenActualParams): Promise<Resource<ResumenTarjetaActual>> {
    const qs = new URLSearchParams({ usuario_id: String(params.usuario_id) })
    if (params.year) qs.set('year', String(params.year))
    if (params.month) qs.set('month', String(params.month))
    return toResource(http.get<ResumenTarjetaActual>(`/api/planning/tarjetas/${id}/resumen-actual?${qs.toString()}`))
  },
  registrarConsumo(payload: ConsumoPayload): Promise<Resource<{ id: number }>> {
    return toResource(http.post<{ id: number }>('/api/planning/consumos', payload))
  },
}
