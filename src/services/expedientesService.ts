import { supabase } from '../lib/supabaseClient'; // O la ruta que estés usando './supabaseClient'

export const expedientesService = {
  // 1. Obtener todos los expedientes
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('mesa_partes_2026') 
        .select('*')
        .order('nro_exp', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id.toString(), 
        numeroExpediente: item.nro_exp ? `EXP-2026-${item.nro_exp}` : `EXP-2026-${item.id}`,
        fechaIngreso: item.fecha,
        remitente: item.nombre_apellido,
        asunto: item.asunto,
        documentos: item.documentos,
        recibido: item.recibido,
        entregadoA: item.entregado_a,
        seguimiento: item.documento_seguimiento,
        created_at: item.created_at,
        estado: 'Pendiente', 
        areaDestino: item.entregado_a || 'Mesa de Partes',
        historial: []
      }));
    } catch (error) {
      console.error('Error al obtener expedientes:', error);
      return [];
    }
  },

  // 2. Obtener uno por ID (Corregido)
  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id.toString(),
        numeroExpediente: data.nro_exp ? `EXP-2026-${data.nro_exp}` : `EXP-2026-${data.id}`,
        fechaIngreso: data.fecha,
        remitente: data.nombre_apellido,
        asunto: data.asunto,
        documentos: data.documentos,
        recibido: data.recibido,
        entregadoA: data.entregado_a,
        seguimiento: data.documento_seguimiento,
        created_at: data.created_at,
        estado: 'Pendiente',
        areaDestino: data.entregado_a || 'Mesa de Partes',
        historial: []
      };
    } catch (error) {
      console.error('Error al obtener expediente:', error);
      return null;
    }
  },

  // 3. Crear nuevo expediente (Corregido y a prueba de fallos)
  async create(expediente: any) {
    try {
      let nextNroExp = expediente.numeroExpediente;
      
      if (!nextNroExp) {
        const { data: lastRecord } = await supabase
          .from('mesa_partes_2026')
          .select('nro_exp')
          .order('nro_exp', { ascending: false })
          .limit(1)
          .maybeSingle(); 
        
        nextNroExp = lastRecord?.nro_exp ? lastRecord.nro_exp + 1 : 1531; 
      }

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .insert([{
          nro_exp: nextNroExp, 
          fecha: expediente.fechaIngreso || new Date().toISOString().split('T')[0],
          nombre_apellido: expediente.remitente || null,
          asunto: expediente.asunto || null,
          documentos: expediente.documentos || null,
          recibido: expediente.recibido || null,
          entregado_a: expediente.entregadoA || null,
          documento_seguimiento: expediente.seguimiento || null
        }])
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id.toString(),
        numeroExpediente: `EXP-2026-${data.nro_exp}`,
        ...expediente
      };
    } catch (error) {
      console.error('Error al crear expediente:', error);
      return null;
    }
  },

  // 4. Actualizar expediente
  async update(id: string, updates: any) {
    try {
      const payload: any = {};
      
      if (updates.remitente) payload.nombre_apellido = updates.remitente;
      if (updates.asunto) payload.asunto = updates.asunto;
      if (updates.documentos) payload.documentos = updates.documentos;
      if (updates.entregadoA) payload.entregado_a = updates.entregado_a;
      if (updates.seguimiento) payload.documento_seguimiento = updates.seguimiento;
      if (updates.areaDestino) payload.entregado_a = updates.areaDestino;

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { id: data.id.toString(), ...data };
    } catch (error) {
      console.error('Error al actualizar expediente:', error);
      return null;
    }
  },

  // 5. Derivar
  async derivar(id: string, areaDestino: string, userId: string, observacion?: string) {
    return await this.update(id, {
      areaDestino,
      entregadoA: areaDestino, 
      observacion
    });
  },

  // 6. Atender
  async atender(id: string, userId: string, observacion?: string) {
    const current = await this.getById(id);
    const nuevoSeguimiento = current?.seguimiento 
      ? `${current.seguimiento} | Atendido: ${observacion}` 
      : `Atendido: ${observacion}`;

    return await this.update(id, {
      seguimiento: nuevoSeguimiento
    });
  },

  // 7. Archivar
  async archivar(id: string, userId: string, observacion?: string) {
    return await this.update(id, {
      areaDestino: 'Archivo Central',
      entregadoA: 'Archivo Central',
      observacion
    });
  },

  // 8. Anular
  async anular(id: string, userId: string, observacion: string) {
    const current = await this.getById(id);
    const nuevoSeguimiento = `ANULADO: ${observacion}`;
    
    return await this.update(id, {
      seguimiento: nuevoSeguimiento,
      asunto: `(ANULADO) ${current?.asunto}`
    });
  }
};