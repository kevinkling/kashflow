import { http, toResource } from '@/data/http'
import type {
  AgendaItem,
  CompraEnCuotasPayload,
  CompromisoPayload,
  ConfirmarPagoPayload,
  ObligacionUpdatePayload,
  SincronizarMesPayload,
  SincronizarMesResult,
} from '@/types/obligacion'
import type { Resource } from '@/types/sync'

export interface AgendaParams {
  desde: string
  hasta: string
  usuario_id: number
}

// Solo los metodos que el UI usa hoy. GET /compromisos,
// POST /instancias y GET /instancias existen en la API pero ningun view los llama.
export const obligacionesRepository = {
  agenda(params: AgendaParams): Promise<Resource<AgendaItem[]>> {
    const qs = new URLSearchParams({
      desde: params.desde,
      hasta: params.hasta,
      usuario_id: String(params.usuario_id),
    })
    return toResource(http.get<AgendaItem[]>(`/api/planning/agenda?${qs.toString()}`))
  },
  sincronizarMes(payload: SincronizarMesPayload): Promise<Resource<SincronizarMesResult>> {
    return toResource(http.post<SincronizarMesResult>('/api/planning/sincronizar-mes', payload))
  },
  crearCompromiso(payload: CompromisoPayload): Promise<Resource<{ id: number }>> {
    return toResource(http.post<{ id: number }>('/api/planning/compromisos', payload))
  },
  crearCompra(payload: CompraEnCuotasPayload): Promise<Resource<{ compromisoId: number; instancias: number[] }>> {
    return toResource(
      http.post<{ compromisoId: number; instancias: number[] }>('/api/planning/compromisos/compra', payload),
    )
  },
  actualizarInstancia(id: number, payload: ObligacionUpdatePayload): Promise<Resource<AgendaItem>> {
    return toResource(http.put<AgendaItem>(`/api/planning/instancias/${id}`, payload))
  },
  eliminarInstancia(id: number): Promise<Resource<{ ok: true }>> {
    return toResource(http.delete<{ ok: true }>(`/api/planning/instancias/${id}`))
  },
  confirmarPago(id: number, payload: ConfirmarPagoPayload): Promise<Resource<{ transaccion_id: number }>> {
    return toResource(http.post<{ transaccion_id: number }>(`/api/planning/instancias/${id}/confirm`, payload))
  },
}
