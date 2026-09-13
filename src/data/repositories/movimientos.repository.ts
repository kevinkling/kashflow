import { http, toResource } from '@/data/http'
import type {
  Movimiento,
  MovimientoCreatePayload,
  MovimientoUpdatePayload,
  TransferenciaPayload,
} from '@/types/movimiento'
import type { Resource } from '@/types/sync'

export const movimientosRepository = {
  listar(): Promise<Resource<Movimiento[]>> {
    return toResource(http.get<Movimiento[]>('/api/movimientos'))
  },
  crear(payload: MovimientoCreatePayload): Promise<Resource<{ id: number }>> {
    return toResource(http.post<{ id: number }>('/api/movimientos', payload))
  },
  actualizar(id: number, payload: MovimientoUpdatePayload): Promise<Resource<{ id: number }>> {
    return toResource(http.put<{ id: number }>(`/api/movimientos/${id}`, payload))
  },
  eliminar(id: number): Promise<Resource<{ ok: true; result: unknown }>> {
    return toResource(http.delete<{ ok: true; result: unknown }>(`/api/movimientos/${id}`))
  },
  transferir(payload: TransferenciaPayload): Promise<Resource<{ ok: true }>> {
    return toResource(http.post<{ ok: true }>('/api/transferencias', payload))
  },
}
