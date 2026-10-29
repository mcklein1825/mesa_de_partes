import { supabase } from '../lib/supabaseClient'
import { Proveido } from '../types'

// 1. Obtener todos los proveídos
export const fetchProveidos = async (): Promise<Proveido[]> => {
  const { data, error } = await supabase
    .from('proveidos')
    .select(`
      id, expediente_id, nro_expediente, fecha, area_destino,
      responsable, instruccion, estado, archivo, archivo_data,
      archivo_tipo, archivo_tamano, created_at
    `)
    .order('id', { ascending: false })

  if (error) throw error
  if (!data) return []

  return data.map((item: any) => ({
    id: String(item.id),
    expedienteId: String(item.expediente_id),
    nroExpediente: String(item.nro_expediente),
    fecha: item.fecha,
    areaDestino: item.area_destino,
    responsable: item.responsable || '',
    instruccion: item.instruccion,
    estado: item.estado,
    archivo: item.archivo || '',
    archivoData: item.archivo_data || '',
    archivoTipo: item.archivo_tipo || '',
    archivoTamano: item.archivo_tamano || 0,
    createdAt: item.created_at
  }))
}