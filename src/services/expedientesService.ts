import { supabase } from '../lib/supabaseClient' // Asegúrate que esta ruta sea correcta

export const expedientesService = {
  async getAll() {
    try {
      // 1. Consultamos SOLO lo que existe en tu tabla real
      const { data, error } = await supabase
        .from('mesa_partes_2026') 
        .select('*')
        .order('nro_exp', { ascending: false });

      if (error) {
        console.error("Error de Supabase:", error);
        throw error;
      }

      if (!data) return [];

      // 2. Transformamos los datos para que tu App entienda
      return data.map((item: any) => {
        // Lógica para determinar el estado si no existe en la BD
        let estadoCalculado = 'Pendiente';
        if (item.entregado_a && item.entregado_a.toLowerCase().includes('archivo')) {
          estadoCalculado = 'Archivado';
        } else if (item.entregado_a && item.entregado_a !== 'Mesa de Partes') {
          estadoCalculado = 'En atención'; // O 'Atendido' según tu lógica
        }

        return {
          id: String(item.id),
          numeroExpediente: item.nro_exp ? `EXP-2026-${item.nro_exp}` : `EXP-2026-${item.id}`,
          fechaIngreso: item.fecha,
          
          // AQUÍ ESTÁ LA CLAVE: Forzamos que exista el nombre aunque venga vacío
          remitente: item.nombre_apellido || 'Sin Nombre', 
          nombre_apellido: item.nombre_apellido || 'Sin Nombre',
          
          asunto: item.asunto || 'Sin Asunto',
          documentos: item.documentos,
          recibido: item.recibido,
          entregadoA: item.entregado_a || 'Mesa de Partes',
          seguimiento: item.documento_seguimiento,
          created_at: item.created_at,
          
          // Inventamos estos campos porque tu tabla no los tiene físicamente
          estado: estadoCalculado, 
          areaDestino: item.entregado_a || 'Mesa de Partes',
          historial: [] 
        };
      });
    } catch (error) {
      console.error('Error crítico al obtener expedientes:', error);
      return [];
    }
  },

  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Misma lógica de transformación para un solo item
      let estadoCalculado = 'Pendiente';
      if (data.entregado_a && data.entregado_a.toLowerCase().includes('archivo')) {
        estadoCalculado = 'Archivado';
      } else if (data.entregado_a && data.entregado_a !== 'Mesa de Partes') {
        estadoCalculado = 'En atención';
      }

      return {
        id: String(data.id),
        numeroExpediente: data.nro_exp ? `EXP-2026-${data.nro_exp}` : `EXP-2026-${data.id}`,
        fechaIngreso: data.fecha,
        remitente: data.nombre_apellido || 'Sin Nombre',
        nombre_apellido: data.nombre_apellido || 'Sin Nombre',
        asunto: data.asunto || 'Sin Asunto',
        documentos: data.documentos,
        recibido: data.recibido,
        entregadoA: data.entregado_a || 'Mesa de Partes',
        seguimiento: data.documento_seguimiento,
        created_at: data.created_at,
        estado: estadoCalculado,
        areaDestino: data.entregado_a || 'Mesa de Partes',
        historial: []
      };
    } catch (error) {
      console.error('Error al obtener expediente:', error);
      return null;
    }
  },

  async create(expediente: any) {
    try {
      // Calcular siguiente número de expediente
      const { data: lastRecord } = await supabase
        .from('mesa_partes_2026')
        .select('nro_exp')
        .order('nro_exp', { ascending: false })
        .limit(1)
        .maybeSingle(); 
      
      const nextNroExp = lastRecord?.nro_exp ? lastRecord.nro_exp + 1 : 1531; 

      // Búsqueda robusta del nombre
      const nombreFinal = 
        expediente.nombre_apellido || 
        expediente.remitente || 
        expediente.remitenteNombre || 
        expediente.nombreCompleto || 
        'Sin Nombre';

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .insert([{
          nro_exp: nextNroExp, 
          fecha: expediente.fechaIngreso ? expediente.fechaIngreso.split('T')[0] : new Date().toISOString().split('T')[0],
          nombre_apellido: nombreFinal, // Guardamos explícitamente aquí
          asunto: expediente.asunto || 'Sin Asunto',
          documentos: expediente.documentos || null,
          recibido: expediente.recibido || null,
          entregado_a: expediente.entregadoA || expediente.areaDestino || 'Mesa de Partes',
          documento_seguimiento: expediente.seguimiento || null
        }])
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: String(data.id),
        numeroExpediente: `EXP-2026-${data.nro_exp}`,
        ...expediente
      };
    } catch (error) {
      console.error('Error al crear expediente:', error);
      return null;
    }
  },

  async update(id: string, updates: any) {
    try {
      const payload: any = {};
      
      // Mapeo directo a columnas reales
      if (updates.nombre_apellido) payload.nombre_apellido = updates.nombre_apellido;
      if (updates.remitente) payload.nombre_apellido = updates.remitente; // Si viene como remitente, va a nombre_apellido
      
      if (updates.asunto) payload.asunto = updates.asunto;
      if (updates.documentos) payload.documentos = updates.documentos;
      if (updates.entregadoA) payload.entregado_a = updates.entregado_a;
      if (updates.areaDestino) payload.entregado_a = updates.areaDestino; // Si cambia área, actualizamos entregado_a
      if (updates.seguimiento) payload.documento_seguimiento = updates.seguimiento;

      // Nota: No podemos actualizar 'estado' directamente porque esa columna no existe en tu BD.
      // El estado se calcula visualmente basado en 'entregado_a'.

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { id: String(data.id), ...data };
    } catch (error) {
      console.error('Error al actualizar expediente:', error);
      return null;
    }
  },

  async derivar(id: string, areaDestino: string, userId: string, observacion?: string) {
    // Derivar es simplemente cambiar a quién se entregó
    return await this.update(id, { areaDestino, entregadoA: areaDestino });
  },

  async atender(id: string, userId: string, observacion?: string) {
    const current = await this.getById(id);
    const nuevoSeguimiento = current?.seguimiento 
      ? `${current.seguimiento} | Atendido: ${observacion}` 
      : `Atendido: ${observacion}`;
    return await this.update(id, { seguimiento: nuevoSeguimiento });
  },

  async archivar(id: string, userId: string, observacion?: string) {
    // Archivar es mover a "Archivo Central"
    return await this.update(id, { areaDestino: 'Archivo Central', entregadoA: 'Archivo Central' });
  },

  async anular(id: string, userId: string, observacion: string) {
    const current = await this.getById(id);
    const nuevoSeguimiento = `ANULADO: ${observacion}`;
    return await this.update(id, { seguimiento: nuevoSeguimiento, asunto: `(ANULADO) ${current?.asunto}` });
  }
};
