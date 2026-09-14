import { supabase } from '../lib/supabaseClient';

export interface Usuario {
  id: string;
  nombre: string;
  rol: string;
  area: string;
  activo: boolean;
  created_at?: string;
}

export const usuariosService = {
  async getAll(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }

    return data || [];
  },

  async create(usuario: Omit<Usuario, 'created_at'>): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .insert([usuario])
      .select()
      .single();

    if (error) {
      console.error('Error al crear usuario:', error);
      return null;
    }

    return data;
  },

  async update(
    id: string,
    cambios: Partial<Omit<Usuario, 'id' | 'created_at'>>
  ): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar usuario:', error);
      return null;
    }

    return data;
  }
};
