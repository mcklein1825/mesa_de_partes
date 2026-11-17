import { supabase } from '../lib/supabaseClient'
import { setAreasCatalog, type AreaResponsableRow } from '../constants/areasCatalog'

type AreaResponsableDb = {
  id: number
  area: string
  subarea: string | null
  responsable: string
  actualizado_en: string | null
}

const toRow = (item: AreaResponsableDb): AreaResponsableRow => ({
  id: item.id,
  area: item.area,
  subarea: item.subarea,
  responsable: item.responsable,
  actualizadoEn: item.actualizado_en
})

export const fetchAreasResponsables = async (): Promise<AreaResponsableRow[]> => {
  const { data, error } = await supabase
    .from('areas_responsables')
    .select('id, area, subarea, responsable, actualizado_en')
    .order('id', { ascending: true })

  if (error) throw error
  return (data || []).map(toRow)
}

/** Lee el catálogo desde Supabase y lo deja disponible para toda la aplicación. */
export const cargarCatalogoAreas = async (): Promise<void> => {
  setAreasCatalog(await fetchAreasResponsables())
}

export type GuardarAreaResponsableInput = {
  /** Omitir para crear; indicar para modificar */
  id?: number
  area: string
  /** null/omitido = área principal; con valor = subárea */
  subarea?: string | null
  responsable: string
}

export const guardarAreaResponsable = async (
  input: GuardarAreaResponsableInput
): Promise<AreaResponsableRow> => {
  const { data, error } = await supabase.rpc('guardar_area_responsable', {
    p_id: input.id ?? null,
    p_area: input.area,
    p_subarea: input.subarea ?? null,
    p_responsable: input.responsable
  })

  if (error) throw error
  await cargarCatalogoAreas()
  return toRow(data as AreaResponsableDb)
}

export const eliminarAreaResponsable = async (id: number): Promise<void> => {
  const { error } = await supabase.rpc('eliminar_area_responsable', { p_id: id })

  if (error) throw error
  await cargarCatalogoAreas()
}
