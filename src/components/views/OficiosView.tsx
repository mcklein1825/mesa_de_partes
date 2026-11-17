import { useMemo, useState } from 'react'
import IconAction from '../common/IconAction'
import { Expediente, Oficio } from '../../types'
import { formatNroExp, displayDate } from '../../utils/expedienteHelpers'
import { formatDocumentNumber } from '../../utils/documentHelpers'
import { getAreaCopia } from '../../constants'
import ExpedienteSelector from '../common/ExpedienteSelector'
import MemoDocumentLink from '../common/MemoDocumentLink'
import StatusBadge from '../common/StatusBadge'
import Modal from '../common/Modal'
import { Copy, Pencil, Search, Trash2 } from 'lucide-react'
import DuplicateDocumentModal from '../modals/DuplicateDocumentModal'

type Props = {
  oficios: Oficio[]
  oficioExpediente: Expediente | null
  expedientes: Expediente[]
  areaOptions: string[]
  showSelector: boolean
  canCreate: boolean
  onCloseSelector: () => void
  onNuevoOficio: () => void
  onSelectExpediente: (exp: Expediente) => void
  onDeleteOficio: (oficio: Oficio) => void
  onEditOficio: (oficio: Oficio) => void
  onDuplicateOficio: (oficio: Oficio) => void
  /** Oficio que se está duplicando: cambia los textos al elegir el expediente */
  oficioParaDuplicar?: Oficio | null
}

export default function OficiosView({
  oficios,
  oficioExpediente,
  expedientes,
  areaOptions,
  showSelector,
  canCreate,
  onCloseSelector,
  onNuevoOficio,
  onSelectExpediente,
  onDeleteOficio,
  onEditOficio,
  onDuplicateOficio,
  oficioParaDuplicar = null
}: Props) {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [areaFilter, setAreaFilter] = useState('Todas')

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return oficios.filter(oficio => {
      const coincideTexto =
        !texto ||
        formatDocumentNumber(oficio.nRegistro, oficio.createdAt)
          .toLowerCase()
          .includes(texto) ||
        formatNroExp(
          oficio.nroExpediente,
          false,
          expedientes.find(
            expediente =>
              String(expediente.id) === String(oficio.expedienteId)
          )?.fechaIngreso
        ).toLowerCase().includes(texto) ||
        oficio.asuntoDetalle.toLowerCase().includes(texto) ||
        oficio.destinatario.toLowerCase().includes(texto) ||
        oficio.realizadoPor.toLowerCase().includes(texto) ||
        oficio.responsable.toLowerCase().includes(texto) ||
        getAreaCopia(oficio.areaDestino).toLowerCase().includes(texto) ||
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

  const formatExpedienteOficio = (oficio: Oficio) =>
    formatNroExp(
      oficio.nroExpediente,
      false,
      expedientes.find(item => item.id === String(oficio.expedienteId))?.fechaIngreso
    )

  return (
    <>
      {showDuplicateModal && (
        <DuplicateDocumentModal<Oficio>
          titleId="duplicate-oficio-modal-title"
          title="Duplicar Oficio"
          description="Busque y seleccione el Oficio que desea duplicar."
          searchLabel="Buscar Oficio"
          searchPlaceholder="N.º de Oficio, expediente, destinatario o asunto"
          items={oficios}
          getSearchText={oficio => [
            formatDocumentNumber(oficio.nRegistro, oficio.createdAt),
            oficio.nroExpediente,
            oficio.asuntoDetalle,
            oficio.destinatario,
            oficio.areaDestino,
            oficio.responsable
          ]}
          getNumber={oficio => formatDocumentNumber(oficio.nRegistro, oficio.createdAt)}
          getDate={oficio => displayDate(oficio.fecha)}
          getSubject={oficio => oficio.asuntoDetalle}
          getDetails={oficio => [
            `Expediente: ${formatExpedienteOficio(oficio)}`,
            `${oficio.areaDestino || 'Sin área destino'} · Destinatario: ${oficio.destinatario || 'Sin destinatario'}`
          ]}
          previewTitle="Oficio que se duplicará"
          getPreview={oficio => [
            { label: 'N.º de Oficio original', value: formatDocumentNumber(oficio.nRegistro, oficio.createdAt) },
            { label: 'Expediente original', value: formatExpedienteOficio(oficio) },
            { label: 'Destinatario', value: oficio.destinatario, wide: true },
            { label: 'Asunto', value: oficio.asuntoDetalle, wide: true }
          ]}
          resultText="Se creará un nuevo Oficio para otro expediente; el original se conservará."
          confirmLabel="Continuar con este Oficio"
          emptyText="No hay Oficios disponibles para duplicar."
          noResultsText="No se encontraron Oficios con esos datos."
          onClose={() => setShowDuplicateModal(false)}
          onConfirm={oficio => {
            setShowDuplicateModal(false)
            onDuplicateOficio(oficio)
          }}
        />
      )}

      {/* MODAL DE SELECCIÓN DE EXPEDIENTE (Igual al de Memos) */}
      {showSelector && (
        <Modal
          titleId="nuevo-oficio-title"
          onClose={onCloseSelector}
          className="memo-modal"
          overlayClassName="memo-modal-overlay"
        >
            <div className="memo-modal-header">
              <div>
                <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
                <h2 id="nuevo-oficio-title">{oficioParaDuplicar ? 'Duplicar Oficio' : 'Nuevo Oficio'}</h2>
                <p>
                  {oficioParaDuplicar
                    ? `Elija un expediente diferente para crear una copia del Oficio ${formatDocumentNumber(oficioParaDuplicar.nRegistro, oficioParaDuplicar.createdAt)}. El original se conservará.`
                    : 'Seleccione el expediente al que desea asociar el Oficio.'}
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
        </Modal>
      )}

      <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Oficios</h1>
          <p className="muted">
            Consulta y gestión de los oficios vinculados a los expedientes.
          </p>
        </div>

        {canCreate && (
          <div className="memo-heading-actions">
            <button
              type="button"
              className="primary-button"
              onClick={onNuevoOficio}
            >
              ＋ Nuevo Oficio
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => setShowDuplicateModal(true)}
            >
              <Copy size={16} aria-hidden="true" /> Duplicar Oficio
            </button>
          </div>
        )}
      </div>

      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} aria-hidden="true" />
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
            <caption className="sr-only">Listado de oficios</caption>
            <thead>
              <tr>
                <th scope="col">N.° REGISTRO</th>
                <th scope="col">EXPEDIENTE</th>
                <th scope="col">FECHA</th>
                <th scope="col">ASUNTO</th>
                <th scope="col">DESTINATARIO</th>
                <th scope="col">ÁREA DESTINO</th>
                <th scope="col">REALIZADO POR</th>
                <th scope="col">RESPONSABLE</th>
                <th scope="col">ADJUNTO</th>
                <th scope="col">ESTADO</th>
                <th scope="col">ACCIONES</th>
              </tr>
            </thead>

            <tbody>
              {resultados.map(oficio => (
                <tr
                  key={oficio.id}
                  className={`priority-row priority-${oficio.estado.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <td data-label="N.° REGISTRO">
                    <b className="exp-id">
                      {formatDocumentNumber(oficio.nRegistro, oficio.createdAt)}
                    </b>
                  </td>

                  <td data-label="EXPEDIENTE">
                    <b className="exp-id">
                      {oficio.nroExpediente
                        ? formatNroExp(
                            oficio.nroExpediente,
                            false,
                            expedientes.find(
                              expediente =>
                                String(expediente.id) ===
                                String(oficio.expedienteId)
                            )?.fechaIngreso
                          )
                        : 'Sin expediente'}
                    </b>
                  </td>

                  <td data-label="FECHA">
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {oficio.fecha ? displayDate(oficio.fecha) : '-'}
                    </span>
                  </td>

                  <td data-label="ASUNTO">
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

                  <td data-label="DESTINATARIO">
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

                  <td data-label="ÁREA DESTINO">
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

                  <td data-label="REALIZADO POR">
                    <span
                      title={oficio.realizadoPor || 'No registrado'}
                      style={{
                        display: 'block',
                        maxWidth: '150px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {oficio.realizadoPor || 'No registrado'}
                    </span>
                  </td>

                  <td data-label="RESPONSABLE">
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

                  <td data-label="ADJUNTO">
                    <MemoDocumentLink
                      archivoData={oficio.archivoData}
                      archivo={oficio.archivo}
                      documento="Oficio"
                    >
                      {oficio.archivo || 'Sin adjunto'}
                    </MemoDocumentLink>
                  </td>

                  <td data-label="ESTADO">
                    <StatusBadge status={oficio.estado} />
                  </td>
                  <td className="col-acciones" data-label="ACCIONES">
                    <div className="table-actions">
                      <IconAction label="Editar" icon={Pencil} onClick={() => onEditOficio(oficio)} />
                      <IconAction label="Eliminar" icon={Trash2} tone="danger" onClick={() => onDeleteOficio(oficio)} />
                    </div>
                  </td>
                </tr>
              ))}

              {resultados.length === 0 && (
                <tr>
                  <td colSpan={11}>
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