import { useMemo, useState } from 'react'
import { Expediente } from '../../types'
import {
  formatNroExp,
  getRemitenteNombre,
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

        const esNumero = /^\d+$/.test(texto)

        const coincideBusqueda = !texto
          ? true
          : esNumero
            ? nroOriginal === texto ||
              nroExp === `exp-2026-${texto.padStart(5, '0')}`
            : nroExp.includes(texto) ||
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
  const area = getAreaDestino(value)

    return (
      <div className="form-group">
        <label>Expediente *</label>

        <div className="selected-expediente">
  <div className="selected-expediente-info">

    <div className="selected-expediente-header">
      <strong>
        {formatNroExp(value.nroExp)}
        {value.esDuplicado ? ' *' : ''}
      </strong>

      <span className="selected-expediente-status">
        Expediente seleccionado
      </span>
    </div>

    <div className="selected-expediente-details">

      <div>
        <small>Remitente</small>
        <span>{getRemitenteNombre(value)}</span>
      </div>

      <div>
        <small>Área actual</small>
        <span>{area || 'Sin área'}</span>
      </div>

      <div className="selected-expediente-asunto">
        <small>Asunto</small>
        <span>{value.asunto || 'Sin asunto'}</span>
      </div>

    </div>

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
            <option value="Todas">Todas las áreas</option>

            {areaOptions.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {resultados.length > 0 && (
          <div
            className="expediente-selector-results"
            style={{
              marginTop: '10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              maxHeight: '350px',
              overflowY: 'auto',
              backgroundColor: '#fff'
            }}
          >
            {resultados.map(item => {
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    borderBottom: '1px solid #eef1f2',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div className="selector-main" style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                    <strong style={{ display: 'block', fontSize: '12px', color: '#0f6b74' }}>
                      {formatNroExp(item.nroExp)}
                      {item.esDuplicado ? ' *' : ''}
                    </strong>
                    <span
                      title={getRemitenteNombre(item)}
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {getRemitenteNombre(item)}
                    </span>
                  </div>

                  <div className="selector-details" style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <small
                      title={area || 'Sin área'}
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#6b7280',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {area || 'Sin área'}
                    </small>
                    <small
                      title={item.asunto || 'Sin asunto'}
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: '#374151',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
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
            <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>
              No se encontraron expedientes con esos criterios.
            </div>
          )}
      </div>
    </div>
  )
}