import { useEffect, useState } from 'react'
import type { Expediente, Memo, Oficio, Proveido, User } from '../../types'
import { supabase } from '../../lib/supabaseClient'
import { fetchExpedientes } from '../../services/expedientesService'
import { fetchMemos } from '../../services/memosService'
import { fetchOficios } from '../../services/oficiosService'
import { fetchProveidos } from '../../services/proveidosService'

export type ExpedienteDocumento = {
  expedienteId: string
  tipoDocumento: 'Memo' | 'Oficio'
}

/**
 * Owns the initial read of the mesa-partes data after an authenticated user enters.
 * The returned setters let feature workflows keep local tables in sync with Supabase.
 */
export default function useMesaPartesData(
  currentUser: User | null,
  notify: (message: string) => void
) {
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [expedientesPage, setExpedientesPage] = useState(1)
  const [memos, setMemos] = useState<Memo[]>([])
  const [oficios, setOficios] = useState<Oficio[]>([])
  const [proveidos, setProveidos] = useState<Proveido[]>([])
  const [expedienteDocumentos, setExpedienteDocumentos] = useState<ExpedienteDocumento[]>([])
  const [loadingDb, setLoadingDb] = useState(true)

  useEffect(() => {
    if (!currentUser) return

    const cargarDeSupabase = async () => {
      setLoadingDb(true)

      try {
        const expedientesData = await fetchExpedientes()
        setExpedientes(expedientesData)
        setExpedientesPage(1)
      } catch (error) {
        console.error('Supabase Error:', error)
        notify('Error al cargar expedientes desde Supabase')
        setLoadingDb(false)
        return
      }

      try {
        setProveidos(await fetchProveidos())
      } catch (error) {
        console.error('Error al cargar proveídos:', error)
      }

      try {
        setMemos(await fetchMemos())
      } catch (error) {
        console.error('Error cargando memos:', error)
      }

      try {
        setOficios(await fetchOficios())
      } catch (error) {
        console.error('Error cargando oficios:', error)
      }

      const { data, error } = await supabase
        .from('expediente_documentos')
        .select('expediente_id, tipo_documento')

      if (error) {
        console.error('Error cargando tipos de documento:', error)
      } else if (data) {
        setExpedienteDocumentos(
          data.map(item => ({
            expedienteId: String(item.expediente_id),
            tipoDocumento: item.tipo_documento as ExpedienteDocumento['tipoDocumento']
          }))
        )
      }

      setLoadingDb(false)
    }

    void cargarDeSupabase()
  }, [currentUser, notify])

  return {
    expedientes,
    setExpedientes,
    expedientesPage,
    setExpedientesPage,
    memos,
    setMemos,
    oficios,
    setOficios,
    proveidos,
    setProveidos,
    expedienteDocumentos,
    setExpedienteDocumentos,
    loadingDb
  }
}
