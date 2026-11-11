import { Expediente, Memo, Oficio, Proveido } from '../../types'
import {
  formatNroExp,
  getRemitenteNombre,
  getAreaDestino,
  createInitialHistory,
  formatDateTime,
  displayDate,
  getDeadlineState
} from '../../utils/expedienteHelpers'
import { formatDocumentNumber } from '../../utils/documentHelpers'
import StatusBadge from '../common/StatusBadge'
import DocumentLink from '../common/DocumentLink'
import MemoDocumentLink from '../common/MemoDocumentLink'
import Modal from '../common/Modal'

export default function TrackingModal({
  item,
  memos,
  oficios,
  proveidos,
  onAttachDocument,
  onClose
}: {
  item?: Expediente
  memos: Memo[]
  oficios: Oficio[]
  proveidos: Proveido[]
  onAttachDocument: (file: File) => Promise<void>
  onClose: () => void
}) {
  if (!item) return null

  // .reverse() hace que el más reciente salga primero
  const history = [
    ...(item.historial || createInitialHistory(item))
  ].reverse()
  const initialHistoryEntry = history[history.length - 1]
  const relatedMemos = memos.filter(
    memo => String(memo.expedienteId) === String(item.id)
  )
  const relatedOficios = oficios.filter(
    oficio => String(oficio.expedienteId) === String(item.id)
  )
  const relatedProveidos = proveidos.filter(
    proveido => String(proveido.expedienteId) === String(item.id)
  )

  const formatTrackingDate = (value: string) => {
    if (!value) return 'Fecha no registrada'
    return formatDateTime(value)
  }

  const deadline = getDeadlineState(item)

  return (
    <Modal
      titleId="tracking-title"
      onClose={onClose}
      className="tracking-modal"
      overlayClassName="modal-backdrop"
      initialFocus="container"
    >
        <div className="tracking-header">
          <div>
            <p className="eyebrow">RUTA DEL EXPEDIENTE</p>

            <h2 id="tracking-title">
              {formatNroExp(item.nroExp, false, item.fechaIngreso)}
              {item.esDuplicado ? ' *' : ''}
            </h2>

            <p>{item.asunto}</p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar seguimiento"
          >
            ×
          </button>
        </div>

        <div className="tracking-summary">
          <span>
            <b>Remitente</b>
            {getRemitenteNombre(item)}
          </span>

          <span>
            <b>Estado actual</b>
            <StatusBadge
              status={
                !item.requiereGestion && item.estado === 'Pendiente'
                  ? 'Solo registro'
                  : item.estado
              }
            />
          </span>

          <span>
            <b>Ubicación actual</b>
            {getAreaDestino(item)}
          </span>

          <span>
            <b>Fecha límite</b>
            {item.plazo ? displayDate(item.plazo) : 'Sin plazo'}
            {deadline.kind === 'vencido' && (
              <small style={{ color: 'var(--ui-danger)', marginLeft: '4px', fontWeight: 'bold' }}>({deadline.label})</small>
            )}
          </span>
          <span>
            <b>Recibido por</b>
            {initialHistoryEntry?.responsable ||
              item.usuarioRegistro ||
              'No registrado'}
          </span>
          <span>
            <b>Fecha de recepción</b>
            {formatTrackingDate(
              initialHistoryEntry?.fechaHora ||
                item.fechaHoraRecepcion ||
                item.fechaIngreso ||
                ''
            )}
          </span>
        </div>

        <section
          className="tracking-documents"
          aria-labelledby="tracking-documents-title"
        >
          <div className="tracking-documents-header">
            <div>
              <p className="eyebrow">EXPEDIENTE DIGITAL</p>
              <h3 id="tracking-documents-title">Documentos vinculados</h3>
            </div>
            <span className="tracking-documents-count">
              {Number(Boolean(item.archivo && item.archivo !== 'Sin adjunto')) +
                relatedMemos.length +
                relatedOficios.length +
                relatedProveidos.length}{' '}
              elementos
            </span>
          </div>

          <div className="tracking-document-list">
            <div className="tracking-document-row">
              <div>
                <strong>Documento de ingreso</strong>
                <small>
                  {item.archivo && item.archivo !== 'Sin adjunto'
                    ? item.archivo
                    : 'Falta adjuntar el documento principal'}
                </small>
              </div>
              <DocumentLink
                item={item}
                onAttach={file => onAttachDocument(file)}
              />
            </div>

            {item.documentos && (
              <div className="tracking-document-row">
                <div>
                  <strong>Documentos declarados al recibir</strong>
                  <small>{item.documentos}</small>
                </div>
                {!item.archivo || item.archivo === 'Sin adjunto' ? (
                  <span className="tracking-file-missing">
                    Falta documento principal
                  </span>
                ) : (
                  <span className="tracking-file-available">
                    Documento principal adjunto
                  </span>
                )}
              </div>
            )}

            {relatedMemos.map(memo => (
              <div className="tracking-document-row" key={`memo-${memo.id}`}>
                <div>
                  <strong>
                    Memo {formatDocumentNumber(memo.nroMemo, memo.createdAt) ||
                      'sin número'}
                  </strong>
                  <small>
                    {memo.asunto || 'Sin asunto'} · {memo.fecha || 'Sin fecha'}
                  </small>
                  <small>
                    Realizado por: {memo.realizadoPor || 'No registrado'} ·
                    {' '}Responsable: {memo.responsable || '—'}
                  </small>
                  {memo.enviaCopia && memo.destinatarioCopia && (
                    <small>Con copia a: {memo.destinatarioCopia}</small>
                  )}
                </div>
                <MemoDocumentLink
                  archivoData={memo.archivoData}
                  archivo={memo.archivo}
                >
                  {memo.archivo || 'Memo sin archivo adjunto'}
                </MemoDocumentLink>
              </div>
            ))}

            {relatedProveidos.map(proveido => (
              <div
                className="tracking-document-row"
                key={`proveido-${proveido.id}`}
              >
                <div>
                  <strong>
                    Proveído {formatDocumentNumber(proveido.id, proveido.createdAt)}
                  </strong>
                  <small>
                    {proveido.instruccion || 'Sin instrucción'} ·{' '}
                    {proveido.fecha || 'Sin fecha'}
                  </small>
                  <small>
                    Realizado por: {proveido.realizadoPor || 'No registrado'} ·
                    {' '}Responsable: {proveido.responsable || '—'}
                  </small>
                </div>
                <MemoDocumentLink
                  archivoData={proveido.archivoData}
                  archivo={proveido.archivo}
                >
                  {proveido.archivo || 'Proveído sin archivo adjunto'}
                </MemoDocumentLink>
              </div>
            ))}

            {relatedOficios.map(oficio => (
              <div className="tracking-document-row" key={`oficio-${oficio.id}`}>
                <div>
                  <strong>
                    Oficio {formatDocumentNumber(oficio.nRegistro, oficio.createdAt) ||
                      'sin número'}
                  </strong>
                  <small>
                    {[oficio.asuntoTipo, oficio.asuntoDetalle]
                      .filter(Boolean)
                      .join(' · ') || 'Sin asunto'}{' '}
                    · {oficio.fecha || 'Sin fecha'}
                  </small>
                  <small>
                    Realizado por: {oficio.realizadoPor || 'No registrado'} ·
                    {' '}Responsable: {oficio.responsable || '—'}
                  </small>
                </div>
                <span className="tracking-file-unavailable">
                  Registro vinculado
                </span>
              </div>
            ))}
          </div>
        </section>

          <div className="timeline">
            {history.map((entry, index) => {
              const accion = String(entry.accion || 'Movimiento registrado')
              const esMovimientoProveido = /(prove[ií]do)/i.test(
                `${accion} ${entry.observacion || ''}`
              )

              const esRegistroInicial =
                index === history.length - 1 &&
                /(expediente registrado|registro inicial|pendiente|solo registro)/i.test(accion)

              const fechaHoraTexto = String(entry.fechaHora || '').trim()

              const fechaMovimiento =
                fechaHoraTexto &&
                !/^(fecha pendiente|fecha no registrada)$/i.test(fechaHoraTexto)
                  ? fechaHoraTexto
                  : entry.fechaIngreso || (index === 0 ? item.fechaIngreso : '') || ''

              const areaInicial =
                entry.areaDestino || entry.areaOrigen || 'Dirección General'

              return (
                <div
                  className={`timeline-item ${
                    index === history.length - 1 ? 'is-first' : ''
                  } ${
                    index === 0 ? 'is-latest' : ''
                  }`}
                  key={`${entry.fechaHora}-${index}`}
                >
                  <div className="timeline-marker" aria-hidden="true">
                    {history.length - index}
                  </div>

                  <div className="timeline-card">
                    <div className="timeline-card-header">
                      <div className="timeline-step-group">
                        <span className="timeline-step">
                          {esRegistroInicial ? 'REGISTRO INICIAL' : `MOVIMIENTO ${history.length - index}`}
                        </span>

                        <strong>{accion}</strong>
                      </div>

                      <time className="timeline-date">
                        {formatTrackingDate(fechaMovimiento)}
                      </time>
                    </div>

                    {esRegistroInicial ? (
                      <div className="timeline-initial-location">
                        <span>EXPEDIENTE RECIBIDO EN</span>
                        <strong>{areaInicial}</strong>
                      </div>
                    ) : (
                      <div className="timeline-route">
                        <div className="timeline-location timeline-location-origin">
                          <span>ORIGEN</span>
                          <strong>{entry.areaOrigen || 'No especificado'}</strong>
                        </div>

                        <div
                          className="timeline-route-connector"
                          aria-label="Derivado hacia"
                        >
                          →
                        </div>

                        <div className="timeline-location timeline-location-destination">
                          <span>DESTINO</span>
                          <strong>{entry.areaDestino || 'No especificado'}</strong>
                        </div>
                      </div>
                    )}

                    <div className="timeline-details">
                      <div className="timeline-detail">
                        <span>
                          {esMovimientoProveido ? 'Responsable' : 'Realizado por'}
                        </span>
                        <strong>{entry.responsable || 'No registrado'}</strong>
                      </div>

                      {entry.responsableDestino && (
                        <div className="timeline-detail">
                          <span>Responsable</span>
                          <strong>{entry.responsableDestino}</strong>
                        </div>
                      )}
                    </div>

                    {entry.observacion && (
                      <div className="timeline-observation">
                        <span>DETALLE DEL MOVIMIENTO</span>
                        <p
                          style={{
                            whiteSpace: 'pre-wrap',
                            maxHeight: '120px',
                            overflowY: 'auto',
                            margin: '4px 0 0 0',
                            paddingRight: '6px'
                          }}
                        >
                          {entry.observacion}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>


        <button
          className="outline-button tracking-close"
          onClick={onClose}
        >
          Ocultar detalle
        </button>
    </Modal>
  )
}