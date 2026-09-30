import { Expediente } from '../../types'
import {
  formatNroExp,
  getRemitenteNombre,
  getAreaDestino,
  createInitialHistory
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

  const history = [
    ...(item.historial || createInitialHistory(item))
  ]

  const formatTrackingDate = (value: string) => {
    if (!value) return 'Fecha no registrada'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="tracking-modal"
        role="dialog"
        aria-modal="true"
        onClick={event => event.stopPropagation()}
      >
        <div className="tracking-header">
          <div>
            <p className="eyebrow">RUTA DEL EXPEDIENTE</p>

            <h2>
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
        </div>

        {item.archivo && item.archivo !== 'Sin adjunto' && (
          <div className="tracking-attachment">
            <b>Documento</b>
            <DocumentLink item={item} />
          </div>
        )}

        <div className="timeline">
          {history.map((entry, index) => (
            <div
              className="timeline-item"
              key={`${entry.fechaHora}-${index}`}
            >
              <div className="timeline-dot" />

              <div className="timeline-card">
                {/* FECHA Y HORA */}
                <time className="timeline-date">
                  {formatTrackingDate(entry.fechaHora)}
                </time>

                {/* ACCIÓN */}
                <div className="timeline-action">
                  {entry.accion}
                </div>

                {/* RUTA */}
                <div className="timeline-route">
                  <b>{entry.areaOrigen || 'No especificado'}</b>

                  <span> → </span>

                  <b>{entry.areaDestino || 'No especificado'}</b>
                </div>

                {/* RESPONSABLE DEL ÁREA */}
                {entry.responsableDestino && (
                  <div className="timeline-responsible">
                    <span>Responsable:</span>{' '}
                    <b>{entry.responsableDestino}</b>
                  </div>
                )}

                {/* QUIÉN REALIZÓ LA ACCIÓN */}
                <div className="timeline-performed-by">
                  <span>Realizado por:</span>{' '}
                  <b>{entry.responsable || 'No registrado'}</b>
                </div>

                {/* OBSERVACIÓN */}
                {entry.observacion && (
                  <p className="timeline-observation">
                    {entry.observacion}
                  </p>
                )}
              </div>
            </div>
          ))}
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