import { http, toResource } from '@/data/http'
import type {
  AjusteEscenario,
  AjusteInstanciaPayload,
  AjusteLibrePayload,
  Escenario,
  ProyeccionMensual,
} from '@/types/escenario'
import type { Resource } from '@/types/sync'

export interface ProyeccionParams {
  meses?: number
  usuario_id?: number
}

// GET /escenarios/:id/saldo-simulado (no mensual) existe en la API pero el dashboard
// no lo llama; solo se usa saldo-simulado-mensual.
export const simuladorRepository = {
  listarEscenarios(usuarioId: number): Promise<Resource<Escenario[]>> {
    return toResource(http.get<Escenario[]>(`/api/planning/escenarios?usuario_id=${usuarioId}`))
  },
  crearEscenario(payload: { usuario_id: number; nombre: string }): Promise<Resource<{ id: number }>> {
    return toResource(http.post<{ id: number }>('/api/planning/escenarios', payload))
  },
  listarAjustes(escenarioId: number): Promise<Resource<AjusteEscenario[]>> {
    return toResource(http.get<AjusteEscenario[]>(`/api/planning/escenarios/${escenarioId}/ajustes`))
  },
  agregarAjuste(
    escenarioId: number,
    payload: AjusteInstanciaPayload | AjusteLibrePayload,
  ): Promise<Resource<{ id: number }>> {
    return toResource(http.post<{ id: number }>(`/api/planning/escenarios/${escenarioId}/ajustes`, payload))
  },
  eliminarAjuste(escenarioId: number, ajusteId: number): Promise<Resource<{ ok: true }>> {
    return toResource(http.delete<{ ok: true }>(`/api/planning/escenarios/${escenarioId}/ajustes/${ajusteId}`))
  },
  proyeccionMensual(escenarioId: number, params: ProyeccionParams = {}): Promise<Resource<ProyeccionMensual[]>> {
    const qs = new URLSearchParams()
    if (params.meses) qs.set('meses', String(params.meses))
    if (params.usuario_id) qs.set('usuario_id', String(params.usuario_id))
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    return toResource(
      http.get<ProyeccionMensual[]>(`/api/planning/escenarios/${escenarioId}/saldo-simulado-mensual${suffix}`),
    )
  },
}
