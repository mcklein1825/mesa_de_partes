import React from 'react';

export interface HistorialItem {
  fecha: string;
  estadoAnterior?: string;
  estadoNuevo: string;
  usuario: string;
  rol: string;
  comentario: string;
}

export interface ExpedienteTrazabilidad {
  codigo: string;
  asunto: string;
  remitente: string;
  estadoActual: string;
  prioridad: string;
  historial: HistorialItem[];
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteTrazabilidad | null;
}

export const ModalTrazabilidad: React.FC<ModalProps> = ({ isOpen, onClose, expediente }) => {
  if (!isOpen || !expediente) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Cabecera del Modal */}
        <div className="tracking-header">
          <div>
            <p className="eyebrow">Trazabilidad del Documento</p>
            <h2>Expediente: {expediente.codigo}</h2>
            <p>{expediente.asunto}</p>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Resumen de datos */}
        <div className="tracking-summary">
          <span><b>Remitente</b> {expediente.remitente}</span>
          <span><b>Estado Actual</b> {expediente.estadoActual}</span>
          <span><b>Prioridad</b> {expediente.prioridad}</span>
        </div>

        {/* Línea de tiempo */}
        <div className="timeline">
          {expediente.historial && expediente.historial.length > 0 ? (
            expediente.historial.map((item, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <strong>{item.estadoAnterior ? `${item.estadoAnterior} ➔ ` : ''}{item.estadoNuevo}</strong>
                    <time>{item.fecha}</time>
                  </div>
                  <p>
                    <span className="timeline-responsible">{item.usuario} ({item.rol})</span>
                  </p>
                  <small>{item.comentario}</small>
                </div>
              </div>
            ))
          ) : (
            <p>No hay registros de trazabilidad.</p>
          )}
        </div>

        {/* Botón de cierre inferior */}
        <button className="legacy-blue-button tracking-close" onClick={onClose}>
          Cerrar Trazabilidad
        </button>

      </div>
    </div>
  );
};
