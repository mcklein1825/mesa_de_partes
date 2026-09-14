// CORRECCIÓN 1: Ruta corregida (de '../lib' a './')
import { supabase } from '../lib/supabaseClient'; 

export const expedientesService = {
  // Obtener todos los expedientes
  async getAll() {
    try {
      // CORRECCIÓN 2: Tabla cambiada de 'expedientes' a 'mesa_partes_2026'
      const { data, error } = await supabase
        .from('mesa_partes_2026') 
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapeo adaptado a tu tabla real (nro_exp, fecha, etc.)
      // Si tu frontend espera un objeto "Expediente" complejo, aquí lo construimos
      return data.map((item: any) => ({
        id: item.id.toString(), // Convertir bigserial a string si es necesario
        numeroExpediente: item.nro_exp ? `EXP-2026-${item.nro_exp}` : `EXP-2026-${item.id}`,
        fechaIngreso: item.fecha,
        remitente: item.nombre_apellido,
        asunto: item.asunto,
        documentos: item.documentos,
        recibido: item.recibido,
        entregadoA: item.entregado_a,
        seguimiento: item.documento_seguimiento,
        created_at: item.created_at,
        // Campos por defecto para que no falle tu UI si los usa
        estado: 'Pendiente', 
        areaDestino: 'Mesa de Partes',
        historial: []
      }));
    } catch (error) {
      console.error('Error al obtener expedientes:', error);
      return [];
    }
  },

  // Obtener uno por ID
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
        numeroExpediente: data.nro_exp,
        fechaIngreso: data.fecha,
        remitente: data.nombre_apellido,
        asunto: data.asunto,
        documentos: data.documentos,
        recibido: data.recibido,
        entregadoA: data.entregado_a,
        seguimiento: data.documento_seguimiento,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error al obtener expediente:', error);
      return null;
    }
  },

  // Crear nuevo expediente
  async create(expediente: any) {
    try {
      // Tu tabla usa bigserial para el ID, así que no lo insertamos manualmente.
      // Asumimos que 'nro_exp' se genera o lo pasas en el objeto.
      
      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .insert([{
          nro_exp: expediente.numeroExpediente || null, // Si tienes lógica de correlativo
          fecha: expediente.fechaIngreso || new Date().toISOString().split('T')[0],
          nombre_apellido: expediente.remitente || '',
          asunto: expediente.asunto || '',
          documentos: expediente.documentos || '',
          recibido: expediente.recibido || '',
          entregado_a: expediente.entregadoA || '',
          documento_seguimiento: expediente.seguimiento || ''
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Retornamos el formato que espera tu frontend
      return {
        id: data.id.toString(),
        numeroExpediente: data.nro_exp,
        ...expediente
      };
    } catch (error) {
      console.error('Error al crear expediente:', error);
      return null;
    }
  },

  // Actualizar expediente (Adaptado a columnas reales)
  async update(id: string, updates: any) {
    try {
      const payload: any = {};
      
      // Mapeo manual de los campos del frontend a la BD
      if (updates.remitente) payload.nombre_apellido = updates.remitente;
      if (updates.asunto) payload.asunto = updates.asunto;
      if (updates.documentos) payload.documentos = updates.documentos;
      if (updates.entregadoA) payload.entregado_a = updates.entregado_a;
      if (updates.seguimiento) payload.documento_seguimiento = updates.seguimiento;
      
      // Si hay cambio de estado lógico (ej. derivar), actualizamos 'entregado_a'
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

  // Derivar (Usa update internamente)
  async derivar(id: string, areaDestino: string, userId: string, observacion?: string) {
    return await this.update(id, {
      areaDestino,
      entregadoA: areaDestino, // Guarda en la columna real
      observacion
    });
  },

  // Atender
  async atender(id: string, userId: string, observacion?: string) {
    // Como tu tabla simple no tiene columna "estado", simulamos la atención
    // agregando una nota en "documento_seguimiento" o dejando 'entregado_a' como final.
    const current = await this.getById(id);
    const nuevoSeguimiento = current?.seguimiento 
      ? `${current.seguimiento} | Atendido: ${observacion}` 
      : `Atendido: ${observacion}`;

    return await this.update(id, {
      seguimiento: nuevoSeguimiento
    });
  },

  // Archivar (Simulado moviendo a un área "Archivo")
  async archivar(id: string, userId: string, observacion?: string) {
    return await this.update(id, {
      areaDestino: 'Archivo Central',
      entregadoA: 'Archivo Central',
      observacion
    });
  },

  // Anular
  async anular(id: string, userId: string, observacion: string) {
    const current = await this.getById(id);
    const nuevoSeguimiento = `ANULADO: ${observacion}`;
    
    return await this.update(id, {
      seguimiento: nuevoSeguimiento,
      asunto: `(ANULADO) ${current?.asunto}`
    });
  }
};
