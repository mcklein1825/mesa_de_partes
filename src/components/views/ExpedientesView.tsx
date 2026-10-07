import { useState } from 'react'
import { Expediente, Status } from '../../types'
import { formatNroExp, displayDate, getRemitenteNombre, getAreaDestino } from '../../utils/expedienteHelpers'
import DocumentLink from '../common/DocumentLink'
import StatusBadge from '../common/StatusBadge'
import DuplicateExpedienteModal from '../modals/DuplicateExpedienteModal'

export default function ExpedientesView({
  items,
  total,
  currentPage,
  onPageChange,
  query,
  setQuery,
  areaFilter,
  areaOptions,
  setAreaFilter,
  remitenteFilter,
  setRemitenteFilter,
  statusFilter,
  setStatusFilter,
  onNew,
  onOpenDocumentType,
  onTracking,
  onDuplicate,
  expedienteDocumentos,
  onAttachDocument,
  onRegisterDate
}: {
  items: Expediente[]
  total: number
  currentPage: number
  onPageChange: (page: number) => void
  query: string
  expedienteDocumentos: {
  expedienteId: string
  tipoDocumento: 'Memo' | 'Oficio'
  }[]
  setQuery: (v: string) => void
  areaFilter: string
  areaOptions: string[]
  setAreaFilter: (v: string) => void
  remitenteFilter: string
  setRemitenteFilter: (v: string) => void
  statusFilter: string
  setStatusFilter: (v: string) => void
  onNew: () => void
  onOpenDocumentType: (id: string, tipo: string) => void
  onTracking: (id: string) => void
  onDuplicate: (expediente: Expediente) => void
  onAttachDocument: (
    id: string,
    file: File
  ) => Promise<void>
  onRegisterDate: (
    expedienteId: string,
    fecha: string
  ) => Promise<void>
}) {
  const pageSize = 20
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageItems = items

  const cell = (value: string, className = '') => (
  <span
    className={`table-cell-text ${className}`}
    title={value}
  >
    {value}
  </span>
)
  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Expedientes</h1>
          <p className="muted">
            Consulta, filtra y gestiona los documentos registrados.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="primary-button"
            onClick={onNew}
          >
            ＋ Nuevo expediente
          </button>

          <button
            className="primary-button"
            onClick={() => setShowDuplicateModal(true)}
          >
            ⧉ Duplicar expediente
          </button>
        </div>
      </div>

      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={query}
              onChange={e => {
                setQuery(e.target.value)
              }}
              placeholder="Buscar por N.° de expediente o asunto..."
            />
          </div>
          <input
            className="filter-input"
            value={remitenteFilter}
           onChange={e => {
            setRemitenteFilter(e.target.value)
          }}
            placeholder="Filtrar por remitente..."
          />
         <select value={areaFilter} 
          onChange={e => {
            setAreaFilter(e.target.value)
          }}>
            <option>Todas</option>
            {areaOptions.map(area => <option key={area}>{area}</option>)}
          </select>

          <select value={statusFilter}
           onChange={e => {
            setStatusFilter(e.target.value)
          }}>
            <option>Todos</option>
            <option>Pendiente</option>
            <option>Sin respuesta</option>
            <option>Atendido</option>
            <option>Archivado</option>
          </select>
          <span className="result-count">{total} resultados</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N.° EXP</th>
                <th>FECHA</th>
                <th>NOMBRE / APELLIDO</th>
                <th>ASUNTO</th>
                <th>UBICACIÓN ACTUAL</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => {
                return (
                  <tr key={item.id}>
                    <td>
                      <b className="exp-id">
                        {formatNroExp(item.nroExp)}
                        {item.esDuplicado ? ' *' : ''}
                      </b>
                    </td>
                    <td>
                      {item.fechaIngreso ? (
                        displayDate(item.fechaIngreso)
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '6px'
                          }}
                        >
                          <span
                            style={{
                              color: '#6b7280',
                              fontSize: '13px'
                            }}
                          >
                            Sin fecha
                          </span>

                          <input
                            type="date"
                            aria-label="Registrar fecha de ingreso"
                            onChange={e => {
                              const fecha = e.target.value

                              if (fecha) {
                                onRegisterDate(item.id, fecha)
                              }
                            }}
                            style={{
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              color: '#374151',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 500
                            }}
                          />
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="person-cell">
                        <span className="small-avatar">
                          {getRemitenteNombre(item).split(' ').map(x => x[0]).slice(0, 2).join('')}
                        </span>
                        <span className="table-cell-group">
                          {cell(
                            getRemitenteNombre(item),
                            'expediente-remitente'
                          )}
                        </span>
                      </span>
                    </td>
                   <td
                      style={{
                        width: '28%',
                        maxWidth: '28%',
                        overflow: 'hidden'
                      }}
                    >
                      <span
                        className="table-cell-group expediente-asunto"
                        style={{
                          display: 'block',
                          width: '100%',
                          maxWidth: '100%',
                          minWidth: 0,
                          overflow: 'hidden'
                        }}
                      >
                        <DocumentLink
                          item={item}
                          onAttach={file =>
                            onAttachDocument(item.id, file)
                          }
                        >
                          {item.asunto}
                        </DocumentLink>
                      </span>
                    </td>
                    <td>
                      <span className="table-cell-group">
                        {cell(getAreaDestino(item))}
                        <small>Ubicación del trámite</small>
                      </span>
                    </td>
                    <td><StatusBadge status={item.estado} /></td>
                   <td className="actions-cell">
                    <button
                      className="tracking-button"
                      onClick={() => onTracking(item.id)}
                    >
                      ◉ Ver seguimiento
                    </button>

                  {item.estado === 'Pendiente' ? (
                  <>
                    <button
                      className="action-link"
                      onClick={() => onOpenDocumentType(item.id, 'Memo')}
                    >
                      Crear Memo
                    </button>

                    <button
                      className="action-link"
                      onClick={() => onOpenDocumentType(item.id, 'Oficio')}
                    >
                      Crear Oficio
                    </button>
                  </>
                ) : null}
                  </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="empty-state">No se encontraron expedientes con esos criterios.</div>
          )}
        </div>

        <div className="pagination">
          Mostrando{' '}
          <b>
            {total === 0
              ? 0
              : (currentPage - 1) * pageSize + 1}
            -
            {Math.min(currentPage * pageSize, total)}
          </b>{' '}
          de <b>{total}</b> expedientes

          <button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            ‹
          </button>

          <b className="current-page">{currentPage}</b>

          <button
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(currentPage + 1)}
          >
            ›
          </button>
        </div>
      </section>
      <DuplicateExpedienteModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onSelect={expediente => {
          onDuplicate({
            id: String(expediente.id),
            nroExp: String(expediente.nro_exp),
            fechaIngreso: expediente.fecha_ingreso || '',
            remitente: expediente.remitente_nombre || '',
            remitenteNombre: expediente.remitente_nombre || '',
            asunto: expediente.asunto || '',
            contenido: '',
            area: expediente.area || '',
            areaDestino: expediente.area_destino || '',
            estado: (expediente.estado || 'Pendiente') as Status,
            plazo: '',
            prioridad: 'Normal',
            archivo: '',
            archivoData: '',
            archivoTipo: '',
            archivoTamano: 0,
            documentos: '',
            modalidadRecepcion: '',
            entregadoA: '',
            canalRecepcion: '',
            folios: 1,
            anexos: 0,
            direccion: '',
            correo: '',
            celular: '',
            representante: '',
            cargoRepresentante: '',
            usuarioRegistro: '',
            fechaHoraRecepcion: '',
            constanciaRecepcion: '',
            historial: [],
            esDuplicado: false
          })

        setShowDuplicateModal(false)
      }}
      />
    </>
  )
}