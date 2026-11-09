import { supabase } from '../lib/supabaseClient'
import { Memo } from '../types'

export const fetchMemos = async (): Promise<Memo[]> => {
  const { data, error } = await supabase
    .from('memos')
    .select(`
      id, nro_memo, expediente_id, nro_expediente, fecha, asunto,
      registrado_por, area_destino, responsable, estado, archivo,
      archivo_data, archivo_tipo, archivo_tamano, created_at
    `)
    .order('id', { ascending: false })

  if (error) throw error
  if (!data) return []

  return data.map((m: any) => ({
    id: String(m.id),
    nroMemo: m.nro_memo || '',
    expedienteId: String(m.expediente_id),
    nroExpediente: m.nro_expediente || '',
    fecha: m.fecha || '',
    asunto: m.asunto || '',
    registradoPor: m.registrado_por || '',
    realizadoPor: m.registrado_por || '',
    areaDestino: m.area_destino || '',
    responsable: m.responsable || '',
    estado: m.estado || 'Pendiente',
    archivo: m.archivo || '',
    archivoData: m.archivo_data || '',
    archivoTipo: m.archivo_tipo || '',
    archivoTamano: m.archivo_tamano || 0,
    createdAt: m.created_at
  }))
}