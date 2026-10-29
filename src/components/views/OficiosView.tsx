import { useMemo, useState } from 'react'
import { Expediente, Oficio } from '../../types'
import { formatNroExp, displayDate } from '../../utils/expedienteHelpers'
import ExpedienteSelector from '../common/ExpedienteSelector'

type Props = {
  oficios: Oficio[]
  oficioExpediente: Expediente | null
  expedientes: Expediente[]
  areaOptions: string[]
  showSelector: boolean
  onCloseSelector: () => void
  onNuevoOficio: () => void
  onSelectExpediente: (exp: Expediente) => void
}

export default function OficiosView({
  oficios,
  oficioExpediente,
  expedientes,
  areaOptions,
  showSelector,
  onCloseSelector,
  onNuevoOficio,
  onSelectExpediente
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [areaFilter, setAreaFilter] = useState('Todas')

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return oficios.filter(oficio => {
      const coincideTexto =
        !texto ||
        oficio.nRegistro.toLowerCase().includes(texto) ||
        oficio.nroExpediente.toLowerCase().includes(texto) ||
        oficio.asuntoDetalle.toLowerCase().includes(texto) ||
        oficio.destinatario.toLowerCase().includes(texto) ||
        oficio.areaDestino.toLowerCase().includes(texto)

      const coincideEstado =
        estadoFiltro === 'Todos' ||
        oficio.estado === estadoFiltro

      const coincideArea =
        areaFilter === 'Todas' ||
        oficio.areaDestino === areaFilter

      return coincideTexto && coincideEstado && coincideArea
    })
  }, [oficios, busqueda, estadoFiltro, areaFilter])

  return (
    <>
      {/* MODAL DE SELECCIÓN DE EXPEDIENTE (Igual al de Memos) */}
      {showSelector && (
        <div
          className="memo-modal-overlay"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              onCloseSelector()
            }
          }}
        >
          <div
            className="memo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nuevo-oficio-title"
          >
            <div className="memo-modal-header">
              <div>
                <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
                <h2 id="nuevo-oficio-title">Nuevo Oficio</h2>
                <p>Seleccione el expediente al que desea asociar el Oficio.</p>
              </div>
              <button
                type="button"
                className="memo-modal-close"
                onClick={onCloseSelector}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="memo-modal-body">
              <div className="section-header">
                <div>
                  <h3>Seleccionar expediente</h3>
                  <p>Busque el expediente por número, asunto, remitente o área.</p>
                </div>
              </div>
              <ExpedienteSelector
                expedientes={expedientes}
                value={null}
                onChange={exp => {
                  if (!exp) return
                  onSelectExpediente(exp)
                }}
                areaOptions={areaOptions}
              />
            </div>

            <div className="memo-modal-footer">
              <button
                type="button"
                className="legacy-light-button"
                onClick={onCloseSelector}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Oficios</h1>
          <p className="muted">
            Consulta y gestión de los oficios vinculados a los expedientes.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onNuevoOficio}
        >
          ＋ Nuevo Oficio
        </button>
      </div>

      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por registro, expediente, asunto o destinatario..."
            />
          </div>

          <select
            value={areaFilter}
            onChange={e => setAreaFilter(e.target.value)}
          >
            <option value="Todas">Todas las áreas</option>
            {areaOptions.map(area => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <select
            value={estadoFiltro}
            onChange={e => setEstadoFiltro(e.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            <option value="Enviado">Enviado</option>
            <option value="Recepcionado">Recepcionado</option>
            <option value="Atendido">Atendido</option>
            <option value="Anulado">Anulado</option>
          </select>

          <span className="result-count">
            {resultados.length} resultados
          </span>
        </div>

        <div className="table-wrap">
          <table className="data-table oficios-table">
            <thead>
              <tr>
                <th>N.° REGISTRO</th>
                <th>EXPEDIENTE</th>
                <th>FECHA</th>
                <th>ASUNTO</th>
                <th>DESTINATARIO</th>
                <th>ÁREA DESTINO</th>
                <th>RESPONSABLE</th>
                <th>ESTADO</th>
              </tr>
            </thead>

            <tbody>
              {resultados.map(oficio => (
                <tr key={oficio.id}>
                  <td>
                    <b className="exp-id">{oficio.nRegistro}</b>
                  </td>

                  <td>
                    <b className="exp-id">
                      {oficio.nroExpediente
                        ? formatNroExp(oficio.nroExpediente)
                        : 'Sin expediente'}
                    </b>
                  </td>

                  <td>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {oficio.fecha ? displayDate(oficio.fecha) : '-'}
                    </span>
                  </td>

                  <td>
                    <div
                      title={[oficio.asuntoTipo, oficio.asuntoDetalle].filter(Boolean).join(' - ')}
                      style={{
                        maxWidth: '250px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {oficio.asuntoTipo && (
                        <strong>{oficio.asuntoTipo} </strong>
                      )}
                      {oficio.asuntoDetalle || (!oficio.asuntoTipo ? '-' : '')}
                    </div>
                  </td>

                  <td>
                    <span
                      title={oficio.destinatario || '-'}
                      style={{
                        display: 'block',
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {oficio.destinatario || '-'}
                    </span>
                  </td>

                  <td>
                    <span
                      title={oficio.areaDestino || '-'}
                      style={{
                        display: 'block',
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {oficio.areaDestino || '-'}
                    </span>
                  </td>

                  <td>
                    <span
                      title={oficio.responsable || '-'}
                      style={{
                        display: 'block',
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {oficio.responsable || '-'}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`status-badge status-${oficio.estado
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                    >
                      {oficio.estado}
                    </span>
                  </td>
                </tr>
              ))}

              {resultados.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      {busqueda || estadoFiltro !== 'Todos'
                        ? 'No se encontraron oficios con esos criterios.'
                        : 'No hay oficios registrados.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          Mostrando {resultados.length} de {oficios.length} oficio
          {oficios.length === 1 ? '' : 's'}.
        </div>
      </section>
    </>
  )
}