export type TipoCategoria = 'ingreso' | 'egreso' | 'neutral'

export interface Categoria {
  id: number
  nombre: string
  icono: string | null
  tipo: TipoCategoria | null
  fecha_creacion: string
}
