import { useEffect, useState } from 'react'
import type { Expediente, Memo, Oficio, Proveido, User, MemorandoMultiple } from '../../types'
import { supabase } from '../../lib/supabaseClient'
import { fetchExpedientes } from '../../services/expedientesService'
import { fetchMemos } from '../../services/memosService'
import { fetchOficios } from '../../services/oficiosService'
import { fetchProveidos } from '../../services/proveidosService'
import { fetchMemorandosMultiples } from '../../services/memorandosMultiplesService'

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
  const [memorandosMultiples, setMemorandosMultiples] = useState<MemorandoMultiple[]>([])
  const [expedienteDocumentos, setExpedienteDocumentos] = useState<ExpedienteDocumento[]>([])
  const [loadingDb, setLoadingDb] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false

    const cargarDeSupabase = async () => {
      setLoadingDb(true)

      const resultados = await Promise.allSettled([
        fetchExpedientes(),
        fetchProveidos(),
        fetchMemos(),
        fetchOficios(),
        fetchMemorandosMultiples(),
        supabase
          .from('expediente_documentos')
          .select('expediente_id, tipo_documento')
      ])

      const [expedientesResult, proveidosResult, memosResult, oficiosResult, memorandosResult, documentosResult] =
        resultados

      if (cancelled) return

      if (expedientesResult.status === 'fulfilled') {
        setExpedientes(expedientesResult.value)
        setExpedientesPage(1)
      } else {
        console.error('Supabase Error cargando expedientes:', expedientesResult.reason)
        notify('Error al cargar expedientes desde Supabase')
      }

      if (proveidosResult.status === 'fulfilled') {
        setProveidos(proveidosResult.value)
      } else {
        console.error('Error al cargar proveídos:', proveidosResult.reason)
      }

      if (memosResult.status === 'fulfilled') {
        setMemos(memosResult.value)
      } else {
        console.error('Error cargando memos:', memosResult.reason)
      }

      if (oficiosResult.status === 'fulfilled') {
        setOficios(oficiosResult.value)
      } else {
        console.error('Error cargando oficios:', oficiosResult.reason)
      }

      if (memorandosResult.status === 'fulfilled') {
        setMemorandosMultiples(memorandosResult.value)
      } else {
        console.error('Error cargando memorandos múltiples:', memorandosResult.reason)
        notify('No se pudieron cargar los memorandos múltiples')
      }

      if (documentosResult.status === 'fulfilled') {
        const { data, error } = documentosResult.value
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
      } else {
        console.error('Error cargando tipos de documento:', documentosResult.reason)
      }

      setLoadingDb(false)
    }

    void cargarDeSupabase()
    return () => {
      cancelled = true
    }
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
    memorandosMultiples,
    setMemorandosMultiples,
    expedienteDocumentos,
    setExpedienteDocumentos,
    loadingDb
  }
}
