import type {
  MemorandoMultiple,
  MemorandoMultipleCategoria,
  MemorandoMultipleDestinatario,
  MemorandoMultipleEstado,
  MemorandoMultipleMedio
} from '../types'
import { supabase } from '../lib/supabaseClient'
import { prepararAdjunto } from '../utils/expedienteHelpers'

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
  archivo?: string | null
  archivo_data?: string | null
  archivo_tipo?: string | null
  archivo_tamano?: number | string | null
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

export const mapMemorandoMultiple = (item: RawMemo): MemorandoMultiple => ({
  id: String(item.id),
  expedienteId: item.expediente_id == null ? '' : String(item.expediente_id),
  nroExpediente: String(item.nro_expediente || ''),
  nroRegistro: `${item.nro_registro}-${new Date(item.fecha).getFullYear()}`,
  fecha: item.fecha,
  asunto: item.asunto,
  realizadoPor: item.realizado_por,
  estado: item.estado,
  createdAt: item.created_at,
  ...(item.archivo ? {
    archivo: item.archivo,
    archivoData: item.archivo_data || '',
    archivoTipo: item.archivo_tipo || '',
    archivoTamano: item.archivo_tamano == null ? undefined : Number(item.archivo_tamano)
  } : {}),
  destinatarios: (item.memorandos_multiples_destinatarios || []).map(mapRecipient)
})

const RECIPIENTS_SELECT = `
  memorandos_multiples_destinatarios (
    id, categoria, nombre, medio_entrega, estado, observacion, fecha_entrega
  )
`
const BASE_COLUMNS = 'id, expediente_id, nro_expediente, nro_registro, fecha, asunto, realizado_por, estado, created_at'
const FILE_COLUMNS = 'archivo, archivo_data, archivo_tipo, archivo_tamano'

type QueryResult = { data: unknown; error: { message?: string } | null }

const queryMemorandos = async (columns: string): Promise<QueryResult> => {
  const { data, error } = await supabase
    .from('memorandos_multiples')
    .select(`${columns}, ${RECIPIENTS_SELECT}`)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const fetchMemorandosMultiples = async (): Promise<MemorandoMultiple[]> => {
  let result = await queryMemorandos(`${BASE_COLUMNS}, ${FILE_COLUMNS}`)

  // Si todavía no se ejecutó el parche 20261113 (columnas de adjunto), se lee la lista sin adjuntos.
  if (result.error && /archivo/i.test(result.error.message || '')) {
    result = await queryMemorandos(BASE_COLUMNS)
  }

  if (result.error) throw result.error
  return ((result.data || []) as RawMemo[]).map(mapMemorandoMultiple)
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
  archivo?: File | null
}

export const createMemorandoMultiple = async (
  input: NewMemorandoMultiple
): Promise<MemorandoMultiple> => {
  const adjunto = input.archivo ? await prepararAdjunto(input.archivo) : null

  const { data, error } = await supabase.rpc('registrar_memorando_multiple', {
    p_expediente_id: Number(input.expedienteId),
    p_nro_expediente: input.nroExpediente,
    p_fecha: input.fecha,
    p_asunto: input.asunto,
    p_destinatarios: input.destinatarios.map(item => ({
      categoria: item.categoria,
      nombre: item.nombre,
      medio_entrega: item.medioEntrega
    })),
    // Solo se envían los datos del adjunto cuando hay uno: así el registro sigue funcionando
    // aunque el parche 20261113 aún no se haya ejecutado en Supabase.
    ...(adjunto ? {
      p_archivo: adjunto.archivo,
      p_archivo_data: adjunto.archivoData,
      p_archivo_tipo: adjunto.archivoTipo,
      p_archivo_tamano: adjunto.archivoTamano
    } : {})
  })

  if (error) throw error
  return mapMemorandoMultiple(data as RawMemo)
}
