import { supabase } from '../lib/supabaseClient'

/**
 * Servicio para gestionar expedientes de Mesa de Partes.
 *
 * Tabla de Supabase:
 * mesa_partes_2026
 *
 * Columnas utilizadas:
 * id
 * nro_exp
 * fecha
 * nombre_apellido
 * asunto
 * documentos
 * recibido
 * entregado_a
 * documento_seguimiento
 * created_at
 */

// ============================================================
// TIPOS
// ============================================================

export interface Expediente {
  id: string
  numeroExpediente: string
  fechaIngreso: string | null
  remitente: string
  nombre_apellido: string
  asunto: string
  documentos: string | null
  recibido: string | null
  entregadoA: string
  seguimiento: string | null
  created_at: string | null
  estado: string
  areaDestino: string
  historial: any[]
}

// ============================================================
// FUNCIÓN PARA TRANSFORMAR DATOS DE SUPABASE
// ============================================================

function transformarExpediente(item: any): Expediente {
  let estadoCalculado = 'Pendiente'

  const entregadoA = item.entregado_a || 'Mesa de Partes'

  if (
    typeof entregadoA === 'string' &&
    entregadoA.toLowerCase().includes('archivo')
  ) {
    estadoCalculado = 'Archivado'
  } else if (
    entregadoA &&
    entregadoA !== 'Mesa de Partes'
  ) {
    estadoCalculado = 'En atención'
  }

  return {
    id: String(item.id),

    numeroExpediente: item.nro_exp
      ? `EXP-2026-${item.nro_exp}`
      : `EXP-2026-${item.id}`,

    fechaIngreso: item.fecha || null,

    remitente:
      item.nombre_apellido ||
      'Sin Nombre',

    nombre_apellido:
      item.nombre_apellido ||
      'Sin Nombre',

    asunto:
      item.asunto ||
      'Sin Asunto',

    documentos:
      item.documentos || null,

    recibido:
      item.recibido || null,

    entregadoA,

    seguimiento:
      item.documento_seguimiento || null,

    created_at:
      item.created_at || null,

    estado: estadoCalculado,

    areaDestino: entregadoA,

    historial: []
  }
}

// ============================================================
// SERVICIO
// ============================================================

export const expedientesService = {

  // ==========================================================
  // OBTENER TODOS
  // ==========================================================

  async getAll(): Promise<Expediente[]> {
    try {
      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .select('*')
        .order('nro_exp', {
          ascending: false
        })

      if (error) {
        console.error(
          'Error de Supabase al obtener expedientes:',
          error
        )

        throw error
      }

      if (!data) {
        return []
      }

      return data.map(transformarExpediente)

    } catch (error) {

      console.error(
        'Error crítico al obtener expedientes:',
        error
      )

      return []
    }
  },

  // ==========================================================
  // OBTENER POR ID
  // ==========================================================

  async getById(
    id: string
  ): Promise<Expediente | null> {

    try {

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error(
          'Error de Supabase al obtener expediente:',
          error
        )

        throw error
      }

      if (!data) {
        return null
      }

      return transformarExpediente(data)

    } catch (error) {

      console.error(
        'Error al obtener expediente:',
        error
      )

      return null
    }
  },

  // ==========================================================
  // CREAR
  // ==========================================================

  async create(expediente: any): Promise<Expediente | null> {

    try {

      // --------------------------------------------------------
      // Obtener el último número de expediente
      // --------------------------------------------------------

      const {
        data: lastRecord,
        error: lastRecordError
      } = await supabase
        .from('mesa_partes_2026')
        .select('nro_exp')
        .not('nro_exp', 'is', null)
        .order('nro_exp', {
          ascending: false
        })
        .limit(1)
        .maybeSingle()

      if (lastRecordError) {
        console.error(
          'Error obteniendo el último número de expediente:',
          lastRecordError
        )

        throw lastRecordError
      }

      // Si existen expedientes, continúa desde el último.
      // Si no existen, comienza desde 1.
      const ultimoNumero = Number(
        lastRecord?.nro_exp || 0
      )

      const nextNroExp = ultimoNumero + 1

      // --------------------------------------------------------
      // Obtener nombre
      // --------------------------------------------------------

      const nombreFinal =
        expediente.nombre_apellido ||
        expediente.remitente ||
        expediente.remitenteNombre ||
        expediente.nombreCompleto ||
        'Sin Nombre'

      // --------------------------------------------------------
      // Fecha
      // --------------------------------------------------------

      const fechaFinal =
        expediente.fechaIngreso
          ? String(expediente.fechaIngreso).split('T')[0]
          : new Date().toISOString().split('T')[0]

      // --------------------------------------------------------
      // Insertar
      // --------------------------------------------------------

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .insert([
          {
            nro_exp: nextNroExp,

            fecha: fechaFinal,

            nombre_apellido: nombreFinal,

            asunto:
              expediente.asunto ||
              'Sin Asunto',

            documentos:
              expediente.documentos ??
              null,

            recibido:
              expediente.recibido ??
              null,

            entregado_a:
              expediente.entregadoA ||
              expediente.areaDestino ||
              'Mesa de Partes',

            documento_seguimiento:
              expediente.seguimiento ??
              null
          }
        ])
        .select()
        .single()

      if (error) {
        console.error(
          'Error de Supabase al crear expediente:',
          error
        )

        throw error
      }

      if (!data) {
        return null
      }

      return transformarExpediente(data)

    } catch (error) {

      console.error(
        'Error al crear expediente:',
        error
      )

      return null
    }
  },

  // ==========================================================
  // ACTUALIZAR
  // ==========================================================

  async update(
    id: string,
    updates: any
  ): Promise<Expediente | null> {

    try {

      const payload: Record<string, any> = {}

      // --------------------------------------------------------
      // Nombre
      // --------------------------------------------------------

      if (
        updates.nombre_apellido !== undefined
      ) {
        payload.nombre_apellido =
          updates.nombre_apellido
      } else if (
        updates.remitente !== undefined
      ) {
        payload.nombre_apellido =
          updates.remitente
      }

      // --------------------------------------------------------
      // Asunto
      // --------------------------------------------------------

      if (
        updates.asunto !== undefined
      ) {
        payload.asunto =
          updates.asunto
      }

      // --------------------------------------------------------
      // Documentos
      // --------------------------------------------------------

      if (
        updates.documentos !== undefined
      ) {
        payload.documentos =
          updates.documentos
      }

      // --------------------------------------------------------
      // Recibido
      // --------------------------------------------------------

      if (
        updates.recibido !== undefined
      ) {
        payload.recibido =
          updates.recibido
      }

      // --------------------------------------------------------
      // Fecha
      // --------------------------------------------------------

      if (
        updates.fechaIngreso !== undefined
      ) {
        payload.fecha =
          updates.fechaIngreso
            ? String(updates.fechaIngreso).split('T')[0]
            : null
      }

      // --------------------------------------------------------
      // Área / Entregado a
      // --------------------------------------------------------

      if (
        updates.entregadoA !== undefined
      ) {
        payload.entregado_a =
          updates.entregadoA
      } else if (
        updates.areaDestino !== undefined
      ) {
        payload.entregado_a =
          updates.areaDestino
      }

      // --------------------------------------------------------
      // Seguimiento
      // --------------------------------------------------------

      if (
        updates.seguimiento !== undefined
      ) {
        payload.documento_seguimiento =
          updates.seguimiento
      }

      // --------------------------------------------------------
      // Evitar UPDATE vacío
      // --------------------------------------------------------

      if (
        Object.keys(payload).length === 0
      ) {
        console.warn(
          'No hay campos para actualizar.'
        )

        return await this.getById(id)
      }

      // --------------------------------------------------------
      // Actualizar Supabase
      // --------------------------------------------------------

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error(
          'Error de Supabase al actualizar expediente:',
          error
        )

        throw error
      }

      if (!data) {
        return null
      }

      return transformarExpediente(data)

    } catch (error) {

      console.error(
        'Error al actualizar expediente:',
        error
      )

      return null
    }
  },

  // ==========================================================
  // DERIVAR
  // ==========================================================

  async derivar(
    id: string,
    areaDestino: string,
    userId: string,
    observacion?: string
  ): Promise<Expediente | null> {

    console.log(
      'Expediente derivado por usuario:',
      userId
    )

    let seguimientoExtra = ''

    if (observacion) {
      seguimientoExtra =
        ` | Derivado a ${areaDestino}: ${observacion}`
    }

    const current =
      await this.getById(id)

    const nuevoSeguimiento =
      current?.seguimiento
        ? `${current.seguimiento}${seguimientoExtra}`
        : seguimientoExtra.replace(' | ', '')

    return await this.update(
      id,
      {
        areaDestino,
        entregadoA: areaDestino,
        seguimiento: nuevoSeguimiento || undefined
      }
    )
  },

  // ==========================================================
  // ATENDER
  // ==========================================================

  async atender(
    id: string,
    userId: string,
    observacion?: string
  ): Promise<Expediente | null> {

    console.log(
      'Expediente atendido por usuario:',
      userId
    )

    const current =
      await this.getById(id)

    const texto =
      observacion
        ? `Atendido: ${observacion}`
        : 'Atendido'

    const nuevoSeguimiento =
      current?.seguimiento
        ? `${current.seguimiento} | ${texto}`
        : texto

    return await this.update(
      id,
      {
        seguimiento:
          nuevoSeguimiento
      }
    )
  },

  // ==========================================================
  // ARCHIVAR
  // ==========================================================

  async archivar(
    id: string,
    userId: string,
    observacion?: string
  ): Promise<Expediente | null> {

    console.log(
      'Expediente archivado por usuario:',
      userId
    )

    const current =
      await this.getById(id)

    const texto =
      observacion
        ? `Archivado: ${observacion}`
        : 'Archivado'

    const nuevoSeguimiento =
      current?.seguimiento
        ? `${current.seguimiento} | ${texto}`
        : texto

    return await this.update(
      id,
      {
        areaDestino: 'Archivo Central',
        entregadoA: 'Archivo Central',
        seguimiento:
          nuevoSeguimiento
      }
    )
  },

  // ==========================================================
  // ANULAR
  // ==========================================================

  async anular(
    id: string,
    userId: string,
    observacion: string
  ): Promise<Expediente | null> {

    console.log(
      'Expediente anulado por usuario:',
      userId
    )

    const current =
      await this.getById(id)

    const asuntoActual =
      current?.asunto ||
      'Sin Asunto'

    const nuevoSeguimiento =
      current?.seguimiento
        ? `${current.seguimiento} | ANULADO: ${observacion}`
        : `ANULADO: ${observacion}`

    return await this.update(
      id,
      {
        seguimiento:
          nuevoSeguimiento,

        asunto:
          `(ANULADO) ${asuntoActual}`
      }
    )
  }
}
```
