import { supabase } from '../lib/supabaseClient';

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
        // Mandamos las dos variantes para asegurar que la interfaz imprima el texto
        remitente: item.nombre_apellido || item.remitente,
        nombre_apellido: item.nombre_apellido || item.remitente,
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

  // 2. Obtener uno por ID
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
        remitente: data.nombre_apellido || data.remitente,
        nombre_apellido: data.nombre_apellido || data.remitente,
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

  // 3. Crear nuevo expediente
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

      const nombreFinal = expediente.nombre_apellido || expediente.remitente;

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .insert([{
          nro_exp: nextNroExp, 
          fecha: expediente.fechaIngreso || new Date().toISOString().split('T')[0],
          nombre_apellido: nombreFinal || null,
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
      const nombreParaActualizar = updates.nombre_apellido || updates.remitente;
      
      if (nombreParaActualizar) payload.nombre_apellido = nombreParaActualizar;
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

  async derivar(id: string, areaDestino: string, userId: string, observacion?: string) {
    return await this.update(id, { areaDestino, entregadoA: areaDestino, observacion });
  },

  async atender(id: string, userId: string, observacion?: string) {
    const current = await this.getById(id);
    const nuevoSeguimiento = current?.seguimiento 
      ? `${current.seguimiento} | Atendido: ${observacion}` 
      : `Atendido: ${observacion}`;
    return await this.update(id, { seguimiento: nuevoSeguimiento });
  },

  async archivar(id: string, userId: string, observacion?: string) {
    return await this.update(id, { areaDestino: 'Archivo Central', entregadoA: 'Archivo Central', observacion });
  },

  async anular(id: string, userId: string, observacion: string) {
    const current = await this.getById(id);
    const nuevoSeguimiento = `ANULADO: ${observacion}`;
    return await this.update(id, { seguimiento: nuevoSeguimiento, asunto: `(ANULADO) ${current?.asunto}` });
  }
};