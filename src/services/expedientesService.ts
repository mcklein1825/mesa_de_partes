import { supabase } from '../lib/supabaseClient';

export const expedientesService = {
  // Obtener todos los expedientes desde el payload JSON
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('expedientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Desempaquetar el payload combinándolo con el id de la fila
      return data.map((item: any) => ({
        id: item.id,
        ...(item.payload || {}),
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    } catch (error) {
      console.error('Error al obtener expedientes:', error);
      return [];
    }
  },

  // Obtener un expediente por ID
  async getById(id: string) {
    try {
      const { data, error } = await supabase
        .from('expedientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        ...(data.payload || {}),
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error al obtener expediente:', error);
      return null;
    }
  },

  // Crear nuevo expediente guardando todo el objeto en el payload
  async create(expediente: any) {
    try {
      const id = expediente.id || `EXP-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('expedientes')
        .insert([{
          id: id,
          payload: expediente
        }])
        .select()
        .single();

      if (error) throw error;
      return { id: data.id, ...(data.payload || {}) };
    } catch (error) {
      console.error('Error al crear expediente:', error);
      return null;
    }
  },

  // Actualizar expediente fusionando los cambios en el payload
  async update(id: string, updates: any) {
    try {
      const current = await this.getById(id);
      if (!current) throw new Error('Expediente no encontrado');

      const updatedPayload = { ...current, ...updates };
      delete updatedPayload.created_at;
      delete updatedPayload.updated_at;

      const { data, error } = await supabase
        .from('expedientes')
        .update({
          payload: updatedPayload,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { id: data.id, ...(data.payload || {}) };
    } catch (error) {
      console.error('Error al actualizar expediente:', error);
      return null;
    }
  },

  // Derivar expediente
  async derivar(id: string, areaDestino: string, userId: string, observacion?: string) {
    const current = await this.getById(id);
    if (!current) return null;

    const historial = [
      ...(current.historial || []),
      {
        accion: 'Derivación',
        areaDestino,
        usuario: userId,
        observacion: observacion || 'Expediente derivado',
        fecha: new Date().toISOString()
      }
    ];

    return await this.update(id, {
      estado: 'En atención',
      areaDestino,
      historial
    });
  },

  // Atender expediente
  async atender(id: string, userId: string, observacion?: string) {
    const current = await this.getById(id);
    if (!current) return null;

    const historial = [
      ...(current.historial || []),
      {
        accion: 'Atención',
        usuario: userId,
        observacion: observacion || 'Expediente atendido',
        fecha: new Date().toISOString()
      }
    ];

    return await this.update(id, {
      estado: 'Atendido',
      fechaAtencion: new Date().toISOString(),
      historial
    });
  },

  // Archivar expediente
  async archivar(id: string, userId: string, observacion?: string) {
    const current = await this.getById(id);
    if (!current) return null;

    const historial = [
      ...(current.historial || []),
      {
        accion: 'Archivo',
        usuario: userId,
        observacion: observacion || 'Expediente archivado',
        fecha: new Date().toISOString()
      }
    ];

    return await this.update(id, {
      estado: 'Archivado',
      fechaArchivo: new Date().toISOString(),
      historial
    });
  },

  // Anular expediente
  async anular(id: string, userId: string, observacion: string) {
    const current = await this.getById(id);
    if (!current) return null;

    const historial = [
      ...(current.historial || []),
      {
        accion: 'Anulación',
        usuario: userId,
        observacion: `Anulado: ${observacion}`,
        fecha: new Date().toISOString()
      }
    ];

    return await this.update(id, {
      estado: 'Anulado',
      observacionAnulacion: observacion,
      historial
    });
  }
};
