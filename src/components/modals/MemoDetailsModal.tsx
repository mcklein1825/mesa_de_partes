import type { Memo } from '../../types'
import { formatNroExp } from '../../utils/expedienteHelpers'
import { formatDocumentNumber } from '../../utils/documentHelpers'
import { getAreaCopia } from '../../constants'
import Modal from '../common/Modal'
import { ExternalLink, X } from 'lucide-react'

export default function MemoDetailsModal({
  memo,
  onClose
}: {
  memo: Memo | null
  onClose: () => void
}) {
  if (!memo) return null

  return (
    <Modal titleId="memo-details-title" onClose={onClose}>
      <div className="section-header">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h2 id="memo-details-title">
            Datos del Memo {formatDocumentNumber(memo.nroMemo, memo.createdAt)}
          </h2>
        </div>
        <button className="action-link" onClick={onClose} aria-label="Cerrar detalle del memo">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="detail-grid">
        <div><strong>N.º Memo</strong><p>{formatDocumentNumber(memo.nroMemo, memo.createdAt) || '—'}</p></div>
        <div><strong>N.º Expediente</strong><p>{formatNroExp(memo.nroExpediente) || '—'}</p></div>
        <div><strong>Fecha</strong><p>{memo.fecha || '—'}</p></div>
        <div><strong>Realizado por</strong><p>{memo.realizadoPor || 'No registrado'}</p></div>
        <div><strong>Área destino</strong><p>{memo.areaDestino ? memo.areaDestino.split(' / ')[0] : '—'}</p></div>
        {getAreaCopia(memo.areaDestino) && <div><strong>Con copia a</strong><p>{getAreaCopia(memo.areaDestino)}</p></div>}
        {memo.areaDestino?.includes(' / ') && <div><strong>Subárea</strong><p>{memo.areaDestino.split(' / ')[1]}</p></div>}
        <div><strong>Responsable</strong><p>{memo.responsable || '—'}</p></div>
        <div><strong>Estado</strong><p>{memo.estado || '—'}</p></div>
        <div>
          <strong>Archivo</strong>
          <p>{memo.archivo || 'Sin archivo'}</p>
          {memo.archivoData && (
            <button className="tracking-button" onClick={() => window.open(memo.archivoData, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={16} aria-hidden="true" /> Abrir archivo
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <strong>Asunto</strong>
        <p>{memo.asunto || 'Sin asunto'}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
        <button className="action-link" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}
