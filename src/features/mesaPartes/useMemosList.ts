import { useEffect, useMemo, useState } from 'react'
import type { Expediente, Memo } from '../../types'
import { AREAS_UNICAS } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { formatNroExp } from '../../utils/expedienteHelpers'
import { formatDocumentNumber } from '../../utils/documentHelpers'
import { getAreaCopia } from '../../constants'

/**
 * Keeps memo-list filters, pagination, and linked expediente documents together.
 */
export default function useMemosList(
  memos: Memo[],
  expedientes: Expediente[],
  areaOptions: string[]
) {
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('Todas')
  const [estadoFilter, setEstadoFilter] = useState('Todos')
  const [page, setPage] = useState(1)
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null)
  const [documentosExpedientes, setDocumentosExpedientes] = useState<
    Record<string, { archivoData: string; archivo: string }>
  >({})
  const pageSize = 20
  const expedientesPorId = useMemo(
    () =>
      new Map(
        expedientes.map(expediente => [String(expediente.id), expediente])
      ),
    [expedientes]
  )

  const memoAreaOptions = useMemo(() => {
    const normalize = (value: string) =>
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
    const blacklist = [
      'NEGRON', 'PEÑALOZA', 'CORREO', 'DRELM', 'JEFATURA',
      'LAS TIENE EL DIRECTOR', 'PENDIENTE DE ASIGNACIÓN',
      'SE LE ENTREGÓ', 'OFICIO', 'FALTA DERIVAR',
      'ENTREGADO A', 'ARCHIVO', 'COORDINADOR', 'FIRMO CARGO'
    ]
    const replacements: Record<string, string> = {
      'SECRETARIA ACADEMICA': 'Secretaría Académica',
      'UNIDAD DE BIENESTAR AL ESTUDIANTE': 'Unidad de Bienestar Estudiantil',
      'UNIDAD DE BIENESTAR DEL ESTUDIANTE': 'Unidad de Bienestar Estudiantil',
      DIRECCION: 'Dirección General',
      ADMINISTRACION: 'Administración'
    }

    return [...areaOptions, ...memos.map(memo => memo.areaDestino).filter(Boolean)]
      .map(area => area.trim())
      .filter(area => !blacklist.some(entry => normalize(area).includes(entry)))
      .map(area => replacements[normalize(area)] || area)
      .filter((area, index, all) =>
        all.findIndex(candidate => normalize(candidate) === normalize(area)) === index
      )
      .sort()
  }, [areaOptions, memos])

  const destinoOptions = useMemo(
    () => AREAS_UNICAS.map(area => ({ value: area, label: area, searchText: area })),
    []
  )
  const estadoOptions = useMemo(
    () => Array.from(new Set(memos.map(memo => memo.estado).filter(Boolean))).sort(),
    [memos]
  )
  const expedientesConMemo = useMemo(
    () => memos.map(memo => String(memo.expedienteId)),
    [memos]
  )

  const memosFiltrados = useMemo(() => {
    const termino = query.trim().toLowerCase()

    return memos.filter(memo => {
      let coincideBusqueda = true

      if (termino) {
        const nroMemo = formatDocumentNumber(
          memo.nroMemo,
          memo.createdAt
        ).toLowerCase()
        const nroExpediente = String(memo.nroExpediente || '').trim().toLowerCase()
        const fechaExpediente = expedientesPorId.get(
          String(memo.expedienteId)
        )?.fechaIngreso
        const nroExpedienteFormateado = formatNroExp(
          nroExpediente,
          false,
          fechaExpediente
        ).toLowerCase()
        const registradoPor = String(memo.registradoPor || '').trim().toLowerCase()
        const asunto = String(memo.asunto || '').trim().toLowerCase()
        const areaDestino = String(memo.areaDestino || '').trim().toLowerCase()
        const responsable = String(memo.responsable || '').trim().toLowerCase()
        const copia = getAreaCopia(memo.areaDestino).toLowerCase()

        if (/^\d+$/.test(termino)) {
          coincideBusqueda =
            nroMemo === termino ||
            nroMemo.startsWith(`${Number(termino)}-`) ||
            nroExpediente === termino ||
            nroExpedienteFormateado.startsWith(`${Number(termino)}-`)
        } else {
          coincideBusqueda =
            nroMemo.includes(termino) ||
            nroExpedienteFormateado.includes(termino) ||
            asunto.includes(termino) ||
            registradoPor.includes(termino) ||
            areaDestino.includes(termino) ||
            responsable.includes(termino) ||
            copia.includes(termino)
        }
      }

      return (
        coincideBusqueda &&
        (areaFilter === 'Todas' || memo.areaDestino === areaFilter) &&
        (estadoFilter === 'Todos' || memo.estado === estadoFilter)
      )
    })
  }, [memos, query, areaFilter, estadoFilter, expedientesPorId])

  const pageCount = Math.max(1, Math.ceil(memosFiltrados.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = memosFiltrados.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const formatExpediente = (nroExp: string, expedienteId?: string) =>
    formatNroExp(
      nroExp,
      false,
      expedientesPorId.get(String(expedienteId))?.fechaIngreso
    )

  useEffect(() => {
    const cargarDocumentosExpedientes = async () => {
      const ids = Array.from(new Set(memos.map(memo => String(memo.expedienteId)).filter(Boolean)))

      if (ids.length === 0) {
        setDocumentosExpedientes({})
        return
      }

      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .select('id, archivo, archivo_data')
        .in('id', ids.map(Number))

      if (error) {
        console.error('Error cargando documentos de expedientes:', error)
        return
      }

      const documentos: Record<string, { archivoData: string; archivo: string }> = {}
      data?.forEach(item => {
        if (item.archivo_data) {
          documentos[String(item.id)] = {
            archivoData: item.archivo_data,
            archivo: item.archivo || 'Documento'
          }
        }
      })

      setDocumentosExpedientes(documentos)
    }

    void cargarDocumentosExpedientes()
  }, [memos])

  return {
    query,
    setQuery,
    areaFilter,
    setAreaFilter,
    estadoFilter,
    setEstadoFilter,
    page,
    setPage,
    selectedMemo,
    setSelectedMemo,
    documentosExpedientes,
    memoAreaOptions,
    destinoOptions,
    estadoOptions,
    expedientesConMemo,
    memosFiltrados,
    pageItems,
    pageSize,
    pageCount,
    currentPage,
    formatExpediente
  }
}
