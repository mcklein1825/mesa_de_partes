import { supabase } from '../lib/supabaseClient'

export const fetchOficioDestinatariosFrecuentes = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('oficio_destinatarios_frecuentes')
    .select('nombre')
    .order('veces_usado', { ascending: false })
    .order('nombre', { ascending: true })
    .limit(30)

  if (error) throw error
  return (data || []).map(item => item.nombre)
}

export const registrarOficioDestinatario = async (nombre: string): Promise<void> => {
  const { error } = await supabase.rpc('registrar_destinatario_oficio', {
    p_nombre: nombre
  })

  if (error) throw error
}
