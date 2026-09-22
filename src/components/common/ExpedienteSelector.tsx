import { useMemo, useState } from 'react'
import { Expediente } from '../../types'
import {
  formatNroExp,
  getRemitenteNombre,
  getRemitenteCargo,
  getAreaDestino
} from '../../utils/expedienteHelpers'

export default function ExpedienteSelector({
  expedientes,
  value,
  onChange,
  areaOptions,
  expedientesExcluidos = []
}: {
  expedientes: Expediente[]
  value: Expediente | null
  onChange: (expediente: Expediente | null) => void
  areaOptions: string[]
  expedientesExcluidos?: string[]
}) {
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('Todas')
  const [remitenteFilter, setRemitenteFilter] = useState('')

  const resultados = useMemo(() => {
    const texto = query.trim().toLowerCase()
    const remitenteTexto = remitenteFilter.trim().toLowerCase()

    if (!texto && !remitenteTexto && areaFilter === 'Todas') {
      return []
    }

    return expedientes
      .filter(item => {
        if (expedientesExcluidos.includes(String(item.id))) {
          return false
        }
        const nroExp = formatNroExp(item.nroExp).toLowerCase()
        const nroOriginal = item.nroExp.toLowerCase()
        const asunto = (item.asunto || '').toLowerCase()
        const remitente = getRemitenteNombre(item).toLowerCase()
        const area = getAreaDestino(item)

        const coincideBusqueda =
          !texto ||
          nroExp.includes(texto) ||
          nroOriginal.includes(texto) ||
          asunto.includes(texto)

        const coincideRemitente =
          !remitenteTexto ||
          remitente.includes(remitenteTexto)

        const coincideArea =
          areaFilter === 'Todas' ||
          area === areaFilter

        return (
          coincideBusqueda &&
          coincideRemitente &&
          coincideArea
        )
      })
      .slice(0, 20)
  }, [
    expedientes,
    query,
    remitenteFilter,
    areaFilter
  ])

  if (value) {
    const cargo = getRemitenteCargo(value)
    const area = getAreaDestino(value)

    return (
      <div className="form-group">
        <label>Expediente *</label>

        <div className="selected-expediente">
          <div>
            <strong>{formatNroExp(value.nroExp)}</strong>

            <small>
              {getRemitenteNombre(value)}
              {cargo ? ` · ${cargo}` : ''}
            </small>

            <small>
              {area || 'Sin área'}
            </small>

            <small>
              {value.asunto || 'Sin asunto'}
            </small>
          </div>

          <button
            type="button"
            className="action-link"
            onClick={() => onChange(null)}
          >
            Cambiar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="form-group">
      <label>Buscar expediente *</label>

      <div className="expediente-selector">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>

            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por N.° de expediente o asunto..."
            />
          </div>

          <input
            className="filter-input"
            value={remitenteFilter}
            onChange={e => setRemitenteFilter(e.target.value)}
            placeholder="Filtrar por remitente..."
          />

          <select
            value={areaFilter}
            onChange={e => setAreaFilter(e.target.value)}
          >
            <option>Todas</option>

            {areaOptions.map(area => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </div>

        {resultados.length > 0 && (
          <div className="expediente-selector-results">
            {resultados.map(item => {
              const cargo = getRemitenteCargo(item)
              const area = getAreaDestino(item)

              return (
                <button
                  key={item.id}
                  type="button"
                  className="expediente-selector-item"
                 onClick={() => {
                    onChange(item)
                    setQuery('')
                    setRemitenteFilter('')
                    setAreaFilter('Todas')
                    }}
                >
                  <div className="selector-main">
                    <strong>{formatNroExp(item.nroExp)}</strong>

                    <span>
                      {getRemitenteNombre(item)}
                      {cargo ? ` · ${cargo}` : ''}
                    </span>
                  </div>

                  <div className="selector-details">
                    <small>
                      {area || 'Sin área'}
                    </small>

                    <small>
                      {item.asunto || 'Sin asunto'}
                    </small>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {(query.trim() || remitenteFilter.trim() || areaFilter !== 'Todas') &&
          resultados.length === 0 && (
            <div className="empty-state">
              No se encontraron expedientes con esos criterios.
            </div>
          )}
      </div>
    </div>
  )
}