import { http, toResource } from '@/data/http'
import type { Categoria } from '@/types/categoria'
import type { Resource } from '@/types/sync'

export const categoriasRepository = {
  listar(): Promise<Resource<Categoria[]>> {
    return toResource(http.get<Categoria[]>('/api/categorias'))
  },
}
