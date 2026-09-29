import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatNroExp } from '../../utils/expedienteHelpers'

type ExpedienteDuplicado = {
  id: number
  nro_exp: number | string
  fecha_ingreso?: string
  remitente_nombre?: string
  asunto?: string
  area?: string
  area_destino?: string
  estado?: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSelect: (expediente: ExpedienteDuplicado) => void
}

export default function DuplicateExpedienteModal({
  isOpen,
  onClose,
  onSelect
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<ExpedienteDuplicado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [seleccionado, setSeleccionado] =
    useState<ExpedienteDuplicado | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setBusqueda('')
      setResultados([])
      setSeleccionado(null)
    }
  }, [isOpen])

  useEffect(() => {
    const termino = busqueda.trim()

    if (!isOpen || !termino) {
      setResultados([])
      return
    }

    const timer = setTimeout(() => {
      buscarExpedientes(termino)
    }, 300)

    return () => clearTimeout(timer)
  }, [busqueda, isOpen])

  const buscarExpedientes = async (termino: string) => {
    setBuscando(true)

    try {
      const esNumero = /^\d+$/.test(termino)

      let query = supabase
        .from('mesa_partes_2026')
        .select(`
          id,
          nro_exp,
          fecha_ingreso,
          remitente_nombre,
          asunto,
          area,
          area_destino,
          estado
        `)
        .limit(10)

      if (esNumero) {
        query = query.eq('nro_exp', Number(termino))
      } else {
        query = query.or(
          `remitente_nombre.ilike.%${termino}%,asunto.ilike.%${termino}%`
        )
      }

      const { data, error } = await query.order('nro_exp', {
        ascending: false
      })

      if (error) {
        console.error(
          'Error buscando expediente para duplicar:',
          error
        )

        setResultados([])
        return
      }

      setResultados(data || [])
    } finally {
      setBuscando(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="duplicate-modal-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="duplicate-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-modal-title"
      >
        <div className="duplicate-modal-header">
          <div>
            <h2 id="duplicate-modal-title">
              Duplicar expediente
            </h2>

            <p>
              Busque y seleccione el expediente que desea duplicar.
            </p>
          </div>

          <button
            type="button"
            className="duplicate-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="duplicate-modal-body">
          <label className="duplicate-search-label">
            Buscar expediente

            <div className="duplicate-search-box">
              <span>⌕</span>

              <input
                type="text"
                value={busqueda}
                onChange={event =>
                  setBusqueda(event.target.value)
                }
                placeholder="N.º de expediente, nombre o asunto"
                autoFocus
              />

              {buscando && (
                <span className="duplicate-search-loading">
                  Buscando...
                </span>
              )}
            </div>
          </label>

          {busqueda.trim() &&
            !buscando &&
            resultados.length === 0 && (
              <div className="duplicate-empty">
                No se encontraron expedientes.
              </div>
            )}

          {resultados.length > 0 && (
            <div className="duplicate-results">
              {resultados.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className="duplicate-result"
                  onClick={() => setSeleccionado(item)}
                >
                  <div className="duplicate-result-top">
                    <strong>
                      {formatNroExp(String(item.nro_exp))}
                    </strong>

                    <span>
                      {item.fecha_ingreso || 'Sin fecha'}
                    </span>
                  </div>

                  <div className="duplicate-result-subject">
                    {item.asunto || 'Sin asunto'}
                  </div>

                  <div className="duplicate-result-details">
                    <span>
                      {item.remitente_nombre || 'Sin nombre'}
                    </span>

                    <span>
                      {item.area_destino ||
                        item.area ||
                        'Sin área'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {seleccionado && (
            <div className="duplicate-preview">
              <div className="duplicate-preview-header">
                <strong>Expediente seleccionado</strong>
              </div>

              <div className="duplicate-preview-content">
                <div>
                  <span>N.º de expediente</span>

                  <strong>
                    {formatNroExp(String(seleccionado.nro_exp))}
                  </strong>
                </div>

                <div>
                  <span>Fecha de ingreso</span>

                  <strong>
                    {seleccionado.fecha_ingreso ||
                      'Sin fecha'}
                  </strong>
                </div>

                <div>
                  <span>Remitente</span>

                  <strong>
                    {seleccionado.remitente_nombre ||
                      'Sin nombre'}
                  </strong>
                </div>

                <div className="duplicate-preview-wide">
                  <span>Asunto</span>

                  <strong>
                    {seleccionado.asunto ||
                      'Sin asunto'}
                  </strong>
                </div>

                <div>
                  <span>Área actual</span>

                  <strong>
                    {seleccionado.area_destino ||
                      seleccionado.area ||
                      'Sin área'}
                  </strong>
                </div>

                <div>
                  <span>Estado</span>

                  <strong>
                    {seleccionado.estado ||
                      'Sin estado'}
                  </strong>
                </div>
              </div>

              <div className="duplicate-new-expediente">
                <span>Nuevo expediente</span>

                <strong>
                  {formatNroExp(
                    String(seleccionado.nro_exp)
                  )}{' '}
                  *
                </strong>
              </div>
            </div>
          )}
        </div>

        <div className="duplicate-modal-footer">
          <button
            type="button"
            className="legacy-light-button"
            onClick={onClose}
          >
            Cancelar
          </button>

          {seleccionado && (
            <button
              type="button"
              className="primary-button"
              onClick={() => onSelect(seleccionado)}
            >
              ⧉ Duplicar expediente
            </button>
          )}
        </div>
      </div>
    </div>
  )
}