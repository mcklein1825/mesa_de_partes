import { useEffect, useRef } from 'react'
import { Expediente } from '../../types'
import {
  formatNroExp,
  getRemitenteNombre,
  getAreaDestino,
  createInitialHistory,
  formatDateTime,
  displayDate,
  getDeadlineState
} from '../../utils/expedienteHelpers'
import StatusBadge from '../common/StatusBadge'
import DocumentLink from '../common/DocumentLink'

export default function TrackingModal({
  item,
  onClose
}: {
  item?: Expediente
  onClose: () => void
}) {
  if (!item) return null

  const modalRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    // Enfocar el modal para que el teclado funcione de inmediato
    modalRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // .reverse() hace que el más reciente salga primero
  const history = [
    ...(item.historial || createInitialHistory(item))
  ].reverse()

  const formatTrackingDate = (value: string) => {
    if (!value) return 'Fecha no registrada'
    return formatDateTime(value)
  }

  const deadline = getDeadlineState(item)

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        ref={modalRef}
        tabIndex={-1}
        className="tracking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracking-title"
        onClick={event => event.stopPropagation()}
        style={{ outline: 'none' }}
      >
        <div className="tracking-header">
          <div>
            <p className="eyebrow">RUTA DEL EXPEDIENTE</p>

            <h2 id="tracking-title">
              {formatNroExp(item.nroExp)}
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
            <StatusBadge status={item.estado} />
          </span>

          <span>
            <b>Ubicación actual</b>
            {getAreaDestino(item)}
          </span>

          <span>
            <b>Fecha límite</b>
            {item.plazo ? displayDate(item.plazo) : 'Sin plazo'}
            {deadline.kind === 'vencido' && (
              <small style={{ color: '#b91c1c', marginLeft: '4px', fontWeight: 'bold' }}>({deadline.label})</small>
            )}
          </span>
        </div>

        {item.archivo && item.archivo !== 'Sin adjunto' && (
          <div className="tracking-attachment">
            <b>Documento</b>
            <DocumentLink item={item} />
          </div>
        )}

                  
          <div className="timeline">
            {history.map((entry, index) => {
              const accion = String(entry.accion || 'Movimiento registrado')

              const esRegistroInicial =
                index === history.length - 1 &&
                /(expediente registrado|registro inicial|pendiente)/i.test(accion)

              const fechaHoraTexto = String(entry.fechaHora || '').trim()

              const fechaMovimiento =
                fechaHoraTexto &&
                !/^(fecha pendiente|fecha no registrada)$/i.test(fechaHoraTexto)
                  ? fechaHoraTexto
                  : entry.fechaIngreso || (index === 0 ? item.fechaIngreso : '') || ''

              const areaInicial =
                entry.areaDestino || entry.areaOrigen || 'Mesa de Partes'

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
                    {index + 1}
                  </div>

                  <div className="timeline-card">
                    <div className="timeline-card-header">
                      <div className="timeline-step-group">
                        <span className="timeline-step">
                          {esRegistroInicial ? 'INICIO DEL TRÁMITE' : `MOVIMIENTO ${index + 1}`}
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
                        <span>Realizado por</span>
                        <strong>{entry.responsable || 'No registrado'}</strong>
                      </div>

                      {entry.responsableDestino && (
                        <div className="timeline-detail">
                          <span>Responsable de destino</span>
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
      </section>
    </div>
  )
}