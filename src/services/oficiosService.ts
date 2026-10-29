import { supabase } from '../lib/supabaseClient'
import { Oficio } from '../types'

// 1. Obtener todos los oficios de la base de datos
export const fetchOficios = async (): Promise<Oficio[]> => {
  const { data, error } = await supabase
    .from('oficios')
    .select('*')
    .order('id', { ascending: false })

  if (error) throw error
  if (!data) return []

  return data.map((item: any) => ({
    id: String(item.id),
    nRegistro: String(item.n_registro ?? ''),
    expedienteId: String(item.expediente_id ?? ''),
    nroExpediente: String(item.nro_expediente ?? ''),
    fecha: item.fecha ?? '',
    destinatario: item.destinatario ?? '',
    asuntoTipo: item.asunto_tipo ?? '',
    asuntoDetalle: item.asunto_detalle ?? '',
    responsable: item.responsable ?? '',
    codigoOad: item.codigo_oad ?? '',
    codigoOgesup: item.codigo_ogesup ?? '',
    anio: Number(item.anio ?? new Date().getFullYear()),
    areaDestino: item.area_destino ?? '',
    estado: item.estado ?? 'Enviado',
    fechaRegistro: item.fecha_registro ?? '',
    createdAt: item.created_at ?? ''
  }))
}