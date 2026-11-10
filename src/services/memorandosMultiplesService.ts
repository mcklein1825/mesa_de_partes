import type {
  MemorandoMultiple,
  MemorandoMultipleCategoria,
  MemorandoMultipleDestinatario,
  MemorandoMultipleEstado,
  MemorandoMultipleMedio
} from '../types'
import { supabase } from '../lib/supabaseClient'

type RawRecipient = {
  id: string
  categoria: MemorandoMultipleCategoria
  nombre: string
  medio_entrega: MemorandoMultipleMedio
  estado: MemorandoMultipleEstado
  observacion: string | null
  fecha_entrega: string | null
}

type RawMemo = {
  id: string
  expediente_id: number | string
  nro_expediente?: string | null
  nro_registro: number
  fecha: string
  asunto: string
  realizado_por: string
  estado: MemorandoMultipleEstado
  created_at: string
  memorandos_multiples_destinatarios: RawRecipient[] | null
}

const mapRecipient = (item: RawRecipient): MemorandoMultipleDestinatario => ({
  id: String(item.id),
  categoria: item.categoria,
  nombre: item.nombre,
  medioEntrega: item.medio_entrega,
  estado: item.estado,
  observacion: item.observacion || '',
  fechaEntrega: item.fecha_entrega || undefined
})

const mapMemo = (item: RawMemo): MemorandoMultiple => ({
  id: String(item.id),
  expedienteId: item.expediente_id == null ? '' : String(item.expediente_id),
  nroExpediente: String(item.nro_expediente || ''),
  nroRegistro: `${item.nro_registro}-${new Date(item.fecha).getFullYear()}`,
  fecha: item.fecha,
  asunto: item.asunto,
  realizadoPor: item.realizado_por,
  estado: item.estado,
  createdAt: item.created_at,
  destinatarios: (item.memorandos_multiples_destinatarios || []).map(mapRecipient)
})

export const fetchMemorandosMultiples = async (): Promise<MemorandoMultiple[]> => {
  const { data, error } = await supabase
    .from('memorandos_multiples')
    .select(`
      id, expediente_id, nro_expediente, nro_registro, fecha, asunto, realizado_por, estado, created_at,
      memorandos_multiples_destinatarios (
        id, categoria, nombre, medio_entrega, estado, observacion, fecha_entrega
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return ((data || []) as RawMemo[]).map(mapMemo)
}

export type NewMemorandoMultiple = {
  expedienteId: string
  nroExpediente: string
  fecha: string
  asunto: string
  destinatarios: Array<{
    categoria: MemorandoMultipleCategoria
    nombre: string
    medioEntrega: MemorandoMultipleMedio
  }>
}

export const createMemorandoMultiple = async (
  input: NewMemorandoMultiple
): Promise<MemorandoMultiple> => {
  const { data, error } = await supabase.rpc('registrar_memorando_multiple', {
    p_expediente_id: Number(input.expedienteId),
    p_nro_expediente: input.nroExpediente,
    p_fecha: input.fecha,
    p_asunto: input.asunto,
    p_destinatarios: input.destinatarios.map(item => ({
      categoria: item.categoria,
      nombre: item.nombre,
      medio_entrega: item.medioEntrega
    }))
  })

  if (error) throw error
  return mapMemo(data as RawMemo)
}
