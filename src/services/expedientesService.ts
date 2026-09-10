import { supabase } from '../lib/supabase';
import type { 
  ExpedienteDB, 
  Movimiento, 
  Area, 
  Remitente, 
  TipoDocumento, 
  Perfil, 
  Rol, 
  Adjunto,
  Status,
  AccionMovimiento 
} from '../types/expediente';

// Servicio para gestión de expedientes en Supabase
export const expedientesService = {
  // Obtener todos los expedientes con datos relacionados
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('expedientes')
        .select(`
          *,
          remitentes (nombre_o_razon_social),
          areas_origen:areas_area_origen_id_fkey (nombre),
          areas_destino:areas_area_destino_id_fkey (nombre),
          ubicacion_actual:areas_ubicacion_actual_id_fkey (nombre),
          tipos_documento (nombre)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear datos a formato frontend
      return data.map(exp => ({
        ...exp,
        remitente_nombre: exp.remitentes?.nombre_o_razon_social,
        area_origen_nombre: exp.areas_origen?.nombre,
        area_destino_nombre: exp.areas_destino?.nombre,
        ubicacion_actual_nombre: exp.ubicacion_actual?.nombre,
        tipo_documento_nombre: exp.tipos_documento?.nombre
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
        .select(`
          *,
          remitentes (nombre_o_razon_social),
          areas_origen:areas_area_origen_id_fkey (nombre),
          areas_destino:areas_area_destino_id_fkey (nombre),
          ubicacion_actual:areas_ubicacion_actual_id_fkey (nombre),
          tipos_documento (nombre),
          movimientos (*),
          adjuntos (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener expediente:', error);
      return null;
    }
  },

  // Crear nuevo expediente
  async create(expediente: Partial<ExpedienteDB>) {
    try {
      const { data, error } = await supabase
        .from('expedientes')
        .insert([expediente])
        .select()
        .single();

      if (error) throw error;
      
      // Registrar movimiento inicial
      if (data.id) {
        await this.registrarMovimiento({
          expediente_id: data.id,
          accion: 'Registro' as AccionMovimiento,
          area_destino_id: expediente.area_origen_id || undefined,
          responsable_id: expediente.registrado_por || undefined,
          observacion: 'Expediente registrado en Mesa de Partes'
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error al crear expediente:', error);
      return null;
    }
  },

  // Actualizar expediente
  async update(id: string, updates: Partial<ExpedienteDB>) {
    try {
      const { data, error } = await supabase
        .from('expedientes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al actualizar expediente:', error);
      return null;
    }
  },

  // Derivar expediente a otra área
  async derivar(id: string, areaDestinoId: string, userId: string, observacion?: string) {
    try {
      // Actualizar ubicación actual y área destino
      const updateResult = await this.update(id, {
        ubicacion_actual_id: areaDestinoId,
        area_destino_id: areaDestinoId,
        estado: 'En atención' as Status
      });

      if (!updateResult) return null;

      // Registrar movimiento
      const movimientoResult = await this.registrarMovimiento({
        expediente_id: id,
        accion: 'Derivación' as AccionMovimiento,
        area_destino_id: areaDestinoId,
        responsable_id: userId,
        observacion: observacion || 'Expediente derivado'
      });

      if (!movimientoResult) return null;

      return updateResult;
    } catch (error) {
      console.error('Error al derivar expediente:', error);
      return null;
    }
  },

  // Atender expediente
  async atender(id: string, userId: string, observacion?: string) {
    try {
      // Actualizar estado y fecha de atención
      const updateResult = await this.update(id, {
        estado: 'Atendido' as Status,
        fecha_atencion: new Date().toISOString()
      });

      if (!updateResult) return null;

      // Registrar movimiento
      const movimientoResult = await this.registrarMovimiento({
        expediente_id: id,
        accion: 'Atención' as AccionMovimiento,
        responsable_id: userId,
        observacion: observacion || 'Expediente atendido'
      });

      if (!movimientoResult) return null;

      return updateResult;
    } catch (error) {
      console.error('Error al atender expediente:', error);
      return null;
    }
  },

  // Archivar expediente
  async archivar(id: string, userId: string, observacion?: string) {
    try {
      // Actualizar estado y fecha de archivo
      const updateResult = await this.update(id, {
        estado: 'Archivado' as Status,
        fecha_archivo: new Date().toISOString()
      });

      if (!updateResult) return null;

      // Registrar movimiento
      const movimientoResult = await this.registrarMovimiento({
        expediente_id: id,
        accion: 'Archivo' as AccionMovimiento,
        responsable_id: userId,
        observacion: observacion || 'Expediente archivado'
      });

      if (!movimientoResult) return null;

      return updateResult;
    } catch (error) {
      console.error('Error al archivar expediente:', error);
      return null;
    }
  },

  // Anular expediente
  async anular(id: string, userId: string, observacion: string) {
    try {
      // Actualizar estado y observación de anulación
      const updateResult = await this.update(id, {
        estado: 'Anulado' as Status,
        observacion_anulacion: observacion
      });

      if (!updateResult) return null;

      // Registrar movimiento
      const movimientoResult = await this.registrarMovimiento({
        expediente_id: id,
        accion: 'Anulación' as AccionMovimiento,
        responsable_id: userId,
        observacion: `Anulado: ${observacion}`
      });

      if (!movimientoResult) return null;

      return updateResult;
    } catch (error) {
      console.error('Error al anular expediente:', error);
      return null;
    }
  },

  // Registrar movimiento
  async registrarMovimiento(movimiento: Partial<Movimiento>) {
    try {
      const { data, error } = await supabase
        .from('movimientos')
        .insert([{
          ...movimiento,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al registrar movimiento:', error);
      return null;
    }
  },

  // Obtener movimientos de un expediente
  async getMovimientos(expedienteId: string) {
    try {
      const { data, error } = await supabase
        .from('movimientos')
        .select(`
          *,
          areas_origen:areas_area_origen_id_fkey (nombre),
          areas_destino:areas_area_destino_id_fkey (nombre),
          perfiles (nombres, apellidos, cargo)
        `)
        .eq('expediente_id', expedienteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      return [];
    }
  },

  // Obtener áreas activas
  async getAreas() {
    try {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('activa', true)
        .order('nombre');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener áreas:', error);
      return [];
    }
  },

  // Obtener remitentes
  async getRemitentes() {
    try {
      const { data, error } = await supabase
        .from('remitentes')
        .select('*')
        .order('nombre_o_razon_social');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener remitentes:', error);
      return [];
    }
  },

  // Crear remitente
  async createRemitente(remitente: Partial<Remitente>) {
    try {
      const { data, error } = await supabase
        .from('remitentes')
        .insert([remitente])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al crear remitente:', error);
      return null;
    }
  },

  // Obtener tipos de documento
  async getTiposDocumento() {
    try {
      const { data, error } = await supabase
        .from('tipos_documento')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener tipos de documento:', error);
      return [];
    }
  },

  // Obtener perfil de usuario
  async getPerfil(userId: string) {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select(`
          *,
          roles (nombre),
          areas (nombre)
        `)
        .eq('id', userId)
        .eq('activo', true)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }
  },

  // Subir archivo adjunto
  async subirAdjunto(file: File, expedienteId: string, userId: string) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${expedienteId}_${Date.now()}.${fileExt}`;
      const filePath = `expedientes/${expedienteId}/${fileName}`;

      // Subir archivo a Storage
      const { error: uploadError } = await supabase.storage
        .from('adjuntos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('adjuntos')
        .getPublicUrl(filePath);

      // Registrar en base de datos
      const { data, error } = await supabase
        .from('adjuntos')
        .insert([{
          expediente_id: expedienteId,
          nombre_archivo: file.name,
          ruta_storage: filePath,
          mime_type: file.type,
          tamano_bytes: file.size,
          subido_por: userId
        }])
        .select()
        .single();

      if (error) throw error;
      return { ...data, url: urlData.publicUrl };
    } catch (error) {
      console.error('Error al subir adjunto:', error);
      return null;
    }
  },

  // Obtener adjuntos de un expediente
  async getAdjuntos(expedienteId: string) {
    try {
      const { data, error } = await supabase
        .from('adjuntos')
        .select('*')
        .eq('expediente_id', expedienteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Agregar URLs públicas
      const adjuntosConUrl = data.map(adj => {
        const { data: urlData } = supabase.storage
          .from('adjuntos')
          .getPublicUrl(adj.ruta_storage);
        return { ...adj, url: urlData.publicUrl };
      });
      
      return adjuntosConUrl;
    } catch (error) {
      console.error('Error al obtener adjuntos:', error);
      return [];
    }
  },

  // Buscar expedientes por texto
  async buscar(texto: string) {
    try {
      const { data, error } = await supabase
        .from('expedientes')
        .select(`
          *,
          remitentes (nombre_o_razon_social),
          areas_origen:areas_area_origen_id_fkey (nombre),
          areas_destino:areas_area_destino_id_fkey (nombre)
        `)
        .or(`numero_expediente.ilike.%${texto}%,asunto.ilike.%${texto}%`)
        .limit(20);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al buscar expedientes:', error);
      return [];
    }
  },

  // Obtener estadísticas para dashboard
  async getEstadisticas() {
    try {
      // Conteo por estado - usando query manual ya que group() no está disponible en esta versión
      const { data: conteoEstado, error: error1 } = await supabase.rpc('conteo_expedientes_por_estado');
      
      // Conteo por área destino - usando query manual
      const { data: conteoArea, error: error2 } = await supabase.rpc('conteo_expedientes_por_area');

      // Expedientes próximos a vencer (7 días)
      const { data: proximosVencer, error: error3 } = await supabase
        .from('expedientes')
        .select('id, numero_expediente, asunto, fecha_limite, estado')
        .lt('fecha_limite', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .eq('estado', 'En atención' as Status);

      if (error3) throw error3;

      return {
        porEstado: conteoEstado || [],
        porArea: conteoArea || [],
        proximosVencer: proximosVencer || []
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      // Fallback: obtener datos básicos sin agrupamiento
      try {
        const { data: todos } = await supabase.from('expedientes').select('estado, area_destino_id, fecha_limite');
        if (!todos) return null;
        
        const porEstado = Object.entries(
          todos.reduce((acc: Record<string, number>, exp: any) => {
            acc[exp.estado] = (acc[exp.estado] || 0) + 1;
            return acc;
          }, {})
        ).map(([estado, count]) => ({ estado, count }));
        
        const porArea = Object.entries(
          todos.reduce((acc: Record<string, number>, exp: any) => {
            if (exp.area_destino_id) {
              acc[exp.area_destino_id] = (acc[exp.area_destino_id] || 0) + 1;
            }
            return acc;
          }, {})
        ).map(([area_destino_id, count]) => ({ area_destino_id, count }));
        
        const proximosVencer = todos
          .filter((exp: any) => 
            exp.fecha_limite && 
            new Date(exp.fecha_limite) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
            exp.estado === 'En atención'
          );
        
        return { porEstado, porArea, proximosVencer };
      } catch (fallbackError) {
        console.error('Error en fallback de estadísticas:', fallbackError);
        return null;
      }
    }
  }
};
