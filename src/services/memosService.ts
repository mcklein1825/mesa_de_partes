import { supabase } from '../lib/supabaseClient'
import { Memo } from '../types'

export const fetchMemos = async (): Promise<Memo[]> => {
  const selectWithCopy = `
      id, nro_memo, expediente_id, nro_expediente, fecha, asunto,
      registrado_por, area_destino, responsable, envia_copia,
      destinatario_copia, estado, archivo,
      archivo_data, archivo_tipo, archivo_tamano, created_at
    `
  const selectLegacy = `
      id, nro_memo, expediente_id, nro_expediente, fecha, asunto,
      registrado_por, area_destino, responsable, estado, archivo,
      archivo_data, archivo_tipo, archivo_tamano, created_at
    `

  let { data, error } = await supabase
    .from('memos')
    .select(selectWithCopy)
    .order('id', { ascending: false })

  if (error && error.code === '42703') {
    console.warn('Columnas de copia aún no migradas; cargando Memos en modo compatible.')
    const legacyResult = await supabase
      .from('memos')
      .select(selectLegacy)
      .order('id', { ascending: false })
    data = legacyResult.data as typeof data
    error = legacyResult.error
  }

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
    enviaCopia: m.envia_copia ?? true,
    destinatarioCopia: m.destinatario_copia || '',
    estado: m.estado || 'Pendiente',
    archivo: m.archivo || '',
    archivoData: m.archivo_data || '',
    archivoTipo: m.archivo_tipo || '',
    archivoTamano: m.archivo_tamano || 0,
    createdAt: m.created_at
  }))
}