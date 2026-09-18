import { Expediente, Memo } from '../../types'

export default function MemosView({
  expediente, memos, onBack, onNewMemo, showMemoForm,
  memoNro, setMemoNro, memoFecha, setMemoFecha,
  memoDestinatario, setMemoDestinatario, memoAsunto, setMemoAsunto,
  memoSecretaria, setMemoSecretaria, memoAreaDestino, setMemoAreaDestino,
  onSaveMemo, onCancelMemo
}: {
  expediente: Expediente | null
  memos: Memo[]
  onBack: () => void
  onNewMemo: () => void
  showMemoForm: boolean
  memoNro: string
  setMemoNro: (value: string) => void
  memoFecha: string
  setMemoFecha: (value: string) => void
  memoDestinatario: string
  setMemoDestinatario: (value: string) => void
  memoAsunto: string
  setMemoAsunto: (value: string) => void
  memoSecretaria: string
  setMemoSecretaria: (value: string) => void
  memoAreaDestino: string
  setMemoAreaDestino: (value: string) => void
  onSaveMemo: () => void
  onCancelMemo: () => void
}) {
  if (!expediente) {
    return <div className="empty-state">No se seleccionó ningún expediente.</div>
  }

  const memosDelExpediente = memos.filter(memo => memo.expedienteId === expediente.id)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Memos</h1>
          <p>Consulta y gestiona los Memos relacionados con expedientes.</p>
        </div>
        <button className="action-link" onClick={onBack}>← Volver a expedientes</button>
      </div>

      <div className="detail-card">
        <div className="detail-grid">
          <div>
            <strong>Expediente</strong>
            <p>
              {expediente.nroExp.startsWith('EXP-')
                ? expediente.nroExp
                : `EXP-2026-${expediente.nroExp.padStart(5, '0')}`}
            </p>
          </div>
          <div>
            <strong>Remitente</strong>
            <p>{expediente.remitente || 'Sin especificar'}</p>
          </div>
          <div>
            <strong>Asunto</strong>
            <p>{expediente.asunto || 'Sin asunto'}</p>
          </div>
        </div>
      </div>

      {showMemoForm && (
        <div className="detail-card">
          <div className="section-header">
            <div>
              <h2>Nuevo Memo</h2>
              <p>Registrar un nuevo Memo relacionado con este expediente.</p>
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <label>N.º Memo</label>
              <input type="text" value={memoNro} onChange={e => setMemoNro(e.target.value)} placeholder="Ej. MEMO-001-2026" />
            </div>
            <div>
              <label>Fecha</label>
              <input type="date" value={memoFecha} onChange={e => setMemoFecha(e.target.value)} />
            </div>
            <div>
              <label>Destinatario</label>
              <input type="text" value={memoDestinatario} onChange={e => setMemoDestinatario(e.target.value)} placeholder="Nombre del destinatario" />
            </div>
            <div>
              <label>Secretaría</label>
              <input type="text" value={memoSecretaria} onChange={e => setMemoSecretaria(e.target.value)} placeholder="Secretaría" />
            </div>
            <div>
              <label>Área destino</label>
              <input type="text" value={memoAreaDestino} onChange={e => setMemoAreaDestino(e.target.value)} placeholder="Área de destino" />
            </div>
            <div>
              <label>Asunto</label>
              <input type="text" value={memoAsunto} onChange={e => setMemoAsunto(e.target.value)} placeholder="Asunto del Memo" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="primary-button" onClick={onSaveMemo}>Guardar Memo</button>
            <button className="action-link" onClick={onCancelMemo}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="table-section">
        <div className="section-header">
          <div>
            <h2>Memos relacionados</h2>
            <p>
              {memosDelExpediente.length} Memo{memosDelExpediente.length !== 1 ? 's' : ''} registrado{memosDelExpediente.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="primary-button" onClick={onNewMemo}>＋ Nuevo Memo</button>
        </div>

        {memosDelExpediente.length === 0 ? (
          <div className="empty-state">No existen Memos registrados para este expediente.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>N.º MEMO</th><th>N.º EXPEDIENTE</th><th>FECHA</th><th>DESTINATARIO</th>
                  <th>ASUNTO</th><th>SECRETARÍA</th><th>ÁREA DESTINO</th><th>RECEPCIONADO POR</th>
                  <th>FECHA RECEPCIÓN</th><th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {memosDelExpediente.map(memo => (
                  <tr key={memo.id}>
                    <td>{memo.nroMemo}</td>
                    <td>{memo.nroExpediente}</td>
                    <td>{memo.fecha}</td>
                    <td>{memo.destinatario || '—'}</td>
                    <td>{memo.asunto || '—'}</td>
                    <td>{memo.secretaria || '—'}</td>
                    <td>{memo.areaDestino || '—'}</td>
                    <td>{memo.recepcionadoPor || '—'}</td>
                    <td>{memo.fechaRecepcion || '—'}</td>
                    <td>{memo.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}