import { useMemo, useState } from 'react'
import { Expediente, Proveido } from '../../types'
import { displayDate, formatNroExp } from '../../utils/expedienteHelpers'
import { formatDocumentNumber } from '../../utils/documentHelpers'
import { getAreaCopia } from '../../constants'
import ExpedienteSelector from '../common/ExpedienteSelector'
import MemoDocumentLink from '../common/MemoDocumentLink'
import StatusBadge from '../common/StatusBadge'
import Modal from '../common/Modal'

type Props = {
  proveidos: Proveido[]
  expedientes: Expediente[]
  areaOptions: string[]
  showSelector: boolean
  canCreate: boolean
  onNuevoProveido: () => void
  onCloseSelector: () => void
  onSelectExpediente: (expediente: Expediente) => void
}

export default function ProveidosView({
  proveidos,
  expedientes,
  areaOptions,
  showSelector,
  canCreate,
  onNuevoProveido,
  onCloseSelector,
  onSelectExpediente
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [areaFilter, setAreaFilter] = useState('Todas')

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return proveidos.filter(proveido => {
      const coincideTexto =
        !texto ||
        formatDocumentNumber(proveido.id, proveido.createdAt)
          .toLowerCase()
          .includes(texto) ||
        formatNroExp(
          proveido.nroExpediente,
          false,
          expedientes.find(
            expediente =>
              String(expediente.id) === String(proveido.expedienteId)
          )?.fechaIngreso
        ).toLowerCase().includes(texto) ||
        proveido.areaDestino.toLowerCase().includes(texto) ||
        getAreaCopia(proveido.areaDestino).toLowerCase().includes(texto) ||
        proveido.realizadoPor.toLowerCase().includes(texto) ||
        proveido.responsable.toLowerCase().includes(texto) ||
        proveido.instruccion.toLowerCase().includes(texto)

      const coincideArea =
        areaFilter === 'Todas' ||
        proveido.areaDestino === areaFilter

      return coincideTexto && coincideArea
    })
  }, [proveidos, busqueda, areaFilter])

  return (
    <>
      {showSelector && (
        <Modal
          titleId="nuevo-proveido-title"
          onClose={onCloseSelector}
          className="memo-modal"
          overlayClassName="memo-modal-overlay"
        >
            <div className="memo-modal-header">
              <div>
                <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
                <h2 id="nuevo-proveido-title">Nuevo Proveído</h2>
                <p>
                  Seleccione el expediente al que desea asociar el Proveído.
                </p>
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
                  <p>
                    Busque el expediente por número, asunto, remitente o área.
                  </p>
                </div>
              </div>

              <ExpedienteSelector
                expedientes={expedientes}
                value={null}
                onChange={expediente => {
                  if (!expediente) return
                  onSelectExpediente(expediente)
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
        </Modal>
      )}

      <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Proveídos</h1>
          <p className="muted">
            Consulta y gestión de los proveídos vinculados a los expedientes.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              onNuevoProveido()
            }}
          >
            ＋ Nuevo Proveído
          </button>
        )}
      </div>

      <section className="panel list-panel proveidos-list">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por proveído, expediente, área o instrucción..."
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

          <span className="result-count">{resultados.length} resultados</span>
        </div>

        <div className="table-wrap">
          <table className="data-table proveidos-table">
            <thead>
              <tr>
                <th>N.º PROVEÍDO</th>
                <th>N.° EXP</th>
                <th>FECHA</th>
                <th>ÁREA DESTINO</th>
                <th>REALIZADO POR</th>
                <th>RESPONSABLE</th>
                <th>INSTRUCCIÓN</th>
                <th>ESTADO</th>
                <th>DOCUMENTO</th>
              </tr>
            </thead>

            <tbody>
              {resultados.map(proveido => (
                <tr key={proveido.id}>
                  <td>
                    <b className="exp-id">
                      {formatDocumentNumber(proveido.id, proveido.createdAt)}
                    </b>
                  </td>
                  <td>
                    <b className="exp-id">
                      {proveido.nroExpediente
                        ? formatNroExp(
                            proveido.nroExpediente,
                            false,
                            expedientes.find(
                              expediente =>
                                String(expediente.id) ===
                                String(proveido.expedienteId)
                            )?.fechaIngreso
                          )
                        : '—'}
                    </b>
                  </td>

                  <td>
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {proveido.fecha ? displayDate(proveido.fecha) : '—'}
                    </span>
                  </td>

                  <td>
                    <span
                      title={proveido.areaDestino || '—'}
                      style={{
                        display: 'block',
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {proveido.areaDestino || '—'}
                    </span>
                    {getAreaCopia(proveido.areaDestino) && (
                      <small>
                        Con copia a: {getAreaCopia(proveido.areaDestino)}
                      </small>
                    )}
                  </td>

                  <td>
                    <span
                      title={proveido.realizadoPor || 'No registrado'}
                      style={{
                        display: 'block',
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {proveido.realizadoPor || 'No registrado'}
                    </span>
                  </td>

                  <td>
                    <span
                      title={proveido.responsable || '—'}
                      style={{
                        display: 'block',
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {proveido.responsable || '—'}
                    </span>
                  </td>

                  <td>
                    <span
                      title={proveido.instruccion || '—'}
                      style={{
                        display: 'block',
                        maxWidth: '250px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {proveido.instruccion || '—'}
                    </span>
                  </td>

                  {/* NUEVO ESTADO */}
                  <td>
                    <StatusBadge status={proveido.estado as any} />
                  </td>

                  <td>
                    <MemoDocumentLink
                      archivoData={proveido.archivoData}
                      archivo={proveido.archivo || ''}
                    >
                      {proveido.archivo || 'Sin adjunto'}
                    </MemoDocumentLink>
                  </td>
                </tr>
              ))}

              {resultados.length === 0 && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      {busqueda
                        ? 'No se encontraron proveídos con esos criterios.'
                        : 'No hay proveídos registrados.'}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          Mostrando {resultados.length} de {proveidos.length} proveído
          {proveidos.length === 1 ? '' : 's'}.
        </div>
      </section>
    </>
  )
}