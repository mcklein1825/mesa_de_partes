import { supabase } from '../lib/supabaseClient'
import { Expediente } from '../types'
import { normalizeExpediente } from '../utils/expedienteHelpers'

// 1. Obtener todos los expedientes de la base de datos
export const fetchExpedientes = async (): Promise<Expediente[]> => {
  const { data, error } = await supabase
    .from('mesa_partes_2026')
    .select(`
      id, nro_exp, fecha_ingreso, remitente_nombre, asunto, contenido,
      area, area_destino, estado, plazo, prioridad, archivo, archivo_tipo,
      archivo_tamano, documentos, modalidad_recepcion, entregado_a,
      canal_recepcion, folios, anexos, direccion, correo, celular,
      representante, cargo_representante, usuario_registro,
      fecha_hora_recepcion, constancia_recepcion, es_duplicado,
      fecha_sin_respuesta, duplicado_de_id
    `)
    .order('nro_exp', { ascending: false })
    .limit(2000)

  if (error) throw error
  if (!data) return []

  return data.map((item: any) => {
    const nombreCompleto = item.remitente_nombre || 'Sin nombre'
    const parts = nombreCompleto.split(/\s*-\s*/, 2)
    
    return normalizeExpediente({
      id: String(item.id || ''),
      nroExp: String(item.nro_exp || ''),
      esDuplicado: Boolean(item.es_duplicado),
      fechaIngreso: item.fecha_ingreso || '',
      remitente: nombreCompleto,
      remitenteNombre: item.remitente_nombre || parts[0]?.trim() || nombreCompleto,
      asunto: item.asunto || '',
      contenido: item.contenido || '',
      area: item.area || '',
      areaDestino: item.area_destino || '',
      estado: item.estado || 'Pendiente',
      plazo: item.plazo || '',
      fechaSinRespuesta: item.fecha_sin_respuesta || '',
      prioridad: item.prioridad || 'Normal',
      archivo: item.archivo || 'Sin adjunto',
      archivoData: '', // Se carga bajo demanda
      archivoTipo: item.archivo_tipo || '',
      archivoTamano: item.archivo_tamano || 0,
      modalidadRecepcion: item.modalidad_recepcion || undefined,
      entregadoA: item.entregado_a || '',
      canalRecepcion: item.canal_recepcion || '',
      folios: item.folios ?? 1,
      anexos: item.anexos ?? 0,
      direccion: item.direccion || '',
      correo: item.correo || '',
      celular: item.celular || '',
      representante: item.representante || '',
      cargoRepresentante: item.cargo_representante || '',
      usuarioRegistro: item.usuario_registro || '',
      fechaHoraRecepcion: item.fecha_hora_recepcion || '',
      constanciaRecepcion: item.constancia_recepcion || '',
      historial: []
    })
  })
}

// 2. Obtener el historial de un expediente específico
export const fetchHistorialExpediente = async (expedienteId: string) => {
  const { data, error } = await supabase
    .from('mesa_partes_2026')
    .select('historial')
    .eq('id', Number(expedienteId))
    .single()

  if (error) throw error
  return Array.isArray(data?.historial) ? data.historial : []
}