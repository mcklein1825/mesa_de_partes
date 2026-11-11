import { supabase } from '../lib/supabaseClient'

export type CrudDocumentType =
  | 'expediente'
  | 'memo'
  | 'oficio'
  | 'proveido'
  | 'memorando_multiple'

export async function updateDocument(
  type: CrudDocumentType,
  id: string,
  data: Record<string, unknown>
) {
  const numericTypes: CrudDocumentType[] = ['expediente', 'memo', 'oficio', 'proveido']
  if (!numericTypes.includes(type) || !/^\d+$/.test(id)) {
    throw new Error('El identificador debe ser numérico para este documento')
  }
  const { data: result, error } = await supabase.rpc('actualizar_documento', {
    p_tipo: type,
    p_id: Number(id),
    p_datos: data
  })
  if (error) throw error
  return result
}

export async function updateMemorandoMultiple(
  id: string,
  data: {
    fecha: string
    asunto: string
    destinatarios: Array<{ categoria: string; nombre: string; medioEntrega: string }>
  }
) {
  const { data: result, error } = await supabase.rpc('actualizar_memorando_multiple', {
    p_id: id,
    p_fecha: data.fecha,
    p_asunto: data.asunto,
    p_destinatarios: data.destinatarios.map(item => ({
      categoria: item.categoria,
      nombre: item.nombre,
      medio_entrega: item.medioEntrega
    }))
  })
  if (error) throw error
  return result
}

export async function deleteDocument(type: CrudDocumentType, id: string) {
  const { data, error } = await supabase.rpc('eliminar_documento', {
    p_tipo: type,
    p_id: id
  })
  if (error) throw error
  return Boolean(data)
}
