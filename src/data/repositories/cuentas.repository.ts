import { http, toResource } from '@/data/http'
import type {
  Cuenta,
  CuentaActualizadaResponse,
  CuentaCreadaResponse,
  CuentaDetalle,
  CuentaPayload,
  CuentaToggleResponse,
  CuentaUpdatePayload,
} from '@/types/cuenta'
import type { Resource } from '@/types/sync'
import type { Usuario } from '@/types/usuario'

export const cuentasRepository = {
  listar(): Promise<Resource<Cuenta[]>> {
    return toResource(http.get<Cuenta[]>('/api/cuentas'))
  },
  /** Incluye cuentas inactivas (vista_saldos_cuentas_admin), usado por la gestion de cuentas. */
  listarGestion(): Promise<Resource<Cuenta[]>> {
    return toResource(http.get<Cuenta[]>('/api/cuentas?gestion=true'))
  },
  listarUsuarios(): Promise<Resource<Usuario[]>> {
    return toResource(http.get<Usuario[]>('/api/cuentas/usuarios'))
  },
  /** GET /api/cuentas/:id devuelve la fila cruda de `cuentas`, no la vista de saldos. */
  obtener(id: number): Promise<Resource<CuentaDetalle>> {
    return toResource(http.get<CuentaDetalle>(`/api/cuentas/${id}`))
  },
  crear(payload: CuentaPayload): Promise<Resource<CuentaCreadaResponse>> {
    return toResource(http.post<CuentaCreadaResponse>('/api/cuentas', payload))
  },
  actualizar(id: number, payload: CuentaUpdatePayload): Promise<Resource<CuentaActualizadaResponse>> {
    return toResource(http.put<CuentaActualizadaResponse>(`/api/cuentas/${id}`, payload))
  },
  toggle(id: number): Promise<Resource<CuentaToggleResponse>> {
    return toResource(http.put<CuentaToggleResponse>(`/api/cuentas/${id}/toggle`, {}))
  },
}
