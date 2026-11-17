import { useMemo, useState } from 'react'
import { Copy, Search } from 'lucide-react'
import Modal from '../common/Modal'

type PreviewField = {
  label: string
  value: string
  wide?: boolean
}

type DuplicateDocumentModalProps<T extends { id: string }> = {
  titleId: string
  title: string
  description: string
  searchLabel: string
  searchPlaceholder: string
  items: T[]
  /** Textos sobre los que busca el cuadro de búsqueda */
  getSearchText: (item: T) => Array<string | undefined>
  getNumber: (item: T) => string
  getDate: (item: T) => string
  getSubject: (item: T) => string
  /** Dos líneas de detalle que se muestran bajo el asunto */
  getDetails: (item: T) => [string, string]
  previewTitle: string
  getPreview: (item: T) => PreviewField[]
  resultText: string
  confirmLabel: string
  emptyText: string
  noResultsText: string
  onClose: () => void
  onConfirm: (item: T) => void
}

/**
 * Ventana para elegir el documento que se desea duplicar (Oficios, Memos múltiples...).
 * Usa los mismos estilos que la ventana de duplicar Memo. Se monta solo cuando está abierta,
 * por lo que la búsqueda y la selección se reinician cada vez.
 */
export default function DuplicateDocumentModal<T extends { id: string }>({
  titleId,
  title,
  description,
  searchLabel,
  searchPlaceholder,
  items,
  getSearchText,
  getNumber,
  getDate,
  getSubject,
  getDetails,
  previewTitle,
  getPreview,
  resultText,
  confirmLabel,
  emptyText,
  noResultsText,
  onClose,
  onConfirm
}: DuplicateDocumentModalProps<T>) {
  const [busqueda, setBusqueda] = useState('')
  const [seleccionado, setSeleccionado] = useState<T | null>(null)

  const resultados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return items

    return items.filter(item =>
      getSearchText(item).some(valor => String(valor || '').toLowerCase().includes(termino))
    )
  }, [items, busqueda, getSearchText])

  return (
    <Modal
      titleId={titleId}
      onClose={onClose}
      className="duplicate-modal"
      overlayClassName="duplicate-modal-overlay"
    >
      <div className="duplicate-modal-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p>{description}</p>
        </div>
        <button
          type="button"
          className="duplicate-modal-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="duplicate-modal-body">
        <label className="duplicate-search-label">
          {searchLabel}
          <div className="duplicate-search-box">
            <Search size={16} aria-hidden="true" />
            <input
              type="text"
              value={busqueda}
              onChange={event => {
                setBusqueda(event.target.value)
                setSeleccionado(null)
              }}
              placeholder={searchPlaceholder}
              autoFocus
            />
          </div>
        </label>

        {resultados.length > 0 ? (
          <div className="duplicate-results">
            {resultados.map(item => {
              const [detalleUno, detalleDos] = getDetails(item)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`duplicate-result${seleccionado?.id === item.id ? ' selected' : ''}`}
                  onClick={() => setSeleccionado(item)}
                >
                  <div className="duplicate-result-top">
                    <strong>{getNumber(item) || 'Sin número'}</strong>
                    <span>{getDate(item) || 'Sin fecha'}</span>
                  </div>
                  <div className="duplicate-result-subject">{getSubject(item) || 'Sin asunto'}</div>
                  <div className="duplicate-result-details">
                    <span>{detalleUno}</span>
                    <span>{detalleDos}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="duplicate-empty">{busqueda.trim() ? noResultsText : emptyText}</div>
        )}

        {seleccionado && (
          <div className="duplicate-preview">
            <div className="duplicate-preview-header">
              <strong>{previewTitle}</strong>
            </div>
            <div className="duplicate-preview-content">
              {getPreview(seleccionado).map(campo => (
                <div key={campo.label} className={campo.wide ? 'duplicate-preview-wide' : undefined}>
                  <span>{campo.label}</span>
                  <strong>{campo.value || '—'}</strong>
                </div>
              ))}
            </div>
            <div className="duplicate-new-expediente">
              <span>Resultado</span>
              <strong>{resultText}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="duplicate-modal-footer">
        <button type="button" className="legacy-light-button" onClick={onClose}>
          Cancelar
        </button>
        {seleccionado && (
          <button type="button" className="primary-button" onClick={() => onConfirm(seleccionado)}>
            <Copy size={16} aria-hidden="true" /> {confirmLabel}
          </button>
        )}
      </div>
    </Modal>
  )
}
