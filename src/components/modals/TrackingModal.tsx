import { Expediente } from '../../types'
import { formatNroExp, getRemitenteNombre, getAreaDestino, createInitialHistory } from '../../utils/expedienteHelpers'
import StatusBadge from '../common/StatusBadge'
import DocumentLink from '../common/DocumentLink'

export default function TrackingModal({ item, onClose }: { item?: Expediente; onClose: () => void }) {
  if (!item) return null

  const history = [...(item.historial || createInitialHistory(item))].reverse()

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="tracking-modal" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
        <div className="tracking-header">
          <div>
            <p className="eyebrow">RUTA SEGUIDA POR EL EXPEDIENTE</p>
            <h2>{formatNroExp(item.nroExp)}</h2>
            <p>{item.asunto}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar seguimiento">×</button>
        </div>

        <div className="tracking-summary">
          <span><b>Remitente</b>{getRemitenteNombre(item)}</span>
          <span><b>Estado actual</b><StatusBadge status={item.estado} /></span>
          <span><b>Ubicación actual</b>{getAreaDestino(item)}</span>
        </div>

        {item.archivoData && (
          <div className="tracking-attachment">
            <b>Documento adjunto</b>
            <DocumentLink item={item} />
            {item.archivoDescripcion && <small>{item.archivoDescripcion}</small>}
          </div>
        )}

        <div className="timeline">
          {history.map((entry, index) => (
            <div className="timeline-item" key={`${entry.fechaHora}-${index}`}>
              <div className="timeline-dot" />
              <div className="timeline-card">
                <div className="timeline-card-header">
                  <strong>{entry.accion}</strong>
                  <time>{entry.fechaHora}</time>
                </div>
                <p>
                  <b>{entry.areaOrigen}</b>
                  <span> → </span>
                  <b>{entry.areaDestino}</b>
                </p>
                {entry.responsableDestino && (
                  <small className="timeline-responsible">
                    Responsable del área: {entry.responsableDestino}
                  </small>
                )}
                <small>Realizado por: {entry.responsable || 'No registrado'}</small>
                <small>{entry.observacion}</small>
              </div>
            </div>
          ))}
        </div>

        <button className="outline-button tracking-close" onClick={onClose}>Ocultar detalle</button>
      </section>
    </div>
  )
}