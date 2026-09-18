import { useState } from 'react'
import { Expediente } from '../../types'
import { formatNroExp, displayDate, getRemitenteNombre, getRemitenteCargo, getAreaDestino } from '../../utils/expedienteHelpers'
import DocumentLink from '../common/DocumentLink'
import StatusBadge from '../common/StatusBadge'

export default function ExpedientesView({
  items, query, setQuery, areaFilter, areaOptions, setAreaFilter,
  remitenteFilter, setRemitenteFilter, statusFilter, setStatusFilter,
  onNew, onOpenDocumentType, onComplete, onTracking,
  expedienteDocumentos
}: {
  items: Expediente[]
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
  onComplete: (id: string) => void
  onTracking: (id: string) => void
}) {
  const pageSize = 20
  const [page, setPage] = useState(1)
  const [selectedDocumentTypeById, setSelectedDocumentTypeById] = useState<Record<string, string>>({})

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const cell = (value: string, className = '') => (
    <span className={`table-cell-text ${className}`} title={value}>{value}</span>
  )

  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Expedientes</h1>
          <p className="muted">Consulta, filtra y gestiona los documentos registrados.</p>
        </div>
        <button className="primary-button" onClick={onNew}>＋ Nuevo expediente</button>
      </div>

      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              placeholder="Buscar por N.° de expediente o asunto..."
            />
          </div>
          <input
            className="filter-input"
            value={remitenteFilter}
            onChange={e => { setRemitenteFilter(e.target.value); setPage(1) }}
            placeholder="Filtrar por remitente..."
          />
          <select value={areaFilter} onChange={e => { setAreaFilter(e.target.value); setPage(1) }}>
            <option>Todas</option>
            {areaOptions.map(area => <option key={area}>{area}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option>Todos</option>
            <option>Pendiente</option>
            <option>En atención</option>
            <option>Atendido</option>
            <option>Archivado</option>
          </select>
          <span className="result-count">{items.length} resultados</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N.° EXP</th>
                <th>FECHA</th>
                <th>NOMBRE / APELLIDO</th>
                <th>ASUNTO</th>
                <th>DOCUMENTOS</th>
                <th>RECIBIDO</th>
                <th>UBICACIÓN ACTUAL</th>
                <th>SEGUIMIENTO</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => {
                const cargo = getRemitenteCargo(item)
                return (
                  <tr key={item.id}>
                    <td><b className="exp-id">{formatNroExp(item.nroExp)}</b></td>
                    <td>{displayDate(item.fechaIngreso || item.fecha)}</td>
                    <td>
                      <span className="person-cell">
                        <span className="small-avatar">
                          {getRemitenteNombre(item).split(' ').map(x => x[0]).slice(0, 2).join('')}
                        </span>
                        <span className="table-cell-group">
                          {cell(getRemitenteNombre(item))}
                          {cargo ? <small>{cargo}</small> : null}
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="table-cell-group">
                        {cell(item.asunto)}
                        <small>{item.tipo}</small>
                      </span>
                    </td>
                    <td><DocumentLink item={item} /></td>
                    <td>{cell(item.canalRecepcion || item.modalidadRecepcion || 'No especificado')}</td>
                    <td>
                      <span className="table-cell-group">
                        {cell(getAreaDestino(item))}
                        <small>Ubicación del trámite</small>
                      </span>
                    </td>
                    <td>{cell(item.documentoSeguimiento || 'Pendiente')}</td>
                    <td><StatusBadge status={item.estado} /></td>
                    <td className="actions-cell">
                      <button className="tracking-button" onClick={() => onTracking(item.id)}>◉ Ver seguimiento</button>
                      {item.estado === 'Pendiente' ? (
                        <div className="document-type-actions">
                          <select
                            className="action-area-select"
                            value={selectedDocumentTypeById[item.id] || ''}
                            onChange={event => setSelectedDocumentTypeById({ ...selectedDocumentTypeById, [item.id]: event.target.value })}
                          >
                            <option value="">Tipo de documento...</option>
                            <option value="Oficio">Oficio</option>
                            <option value="Memo">Memo</option>
                          </select>
                          <button className="action-link" onClick={() => onOpenDocumentType(item.id, selectedDocumentTypeById[item.id] || '')}>Abrir</button>
                        </div>
                      ) : item.estado === 'En atención' ? (
                        <button className="action-link" onClick={() => onComplete(item.id)}>Atender</button>
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
          Mostrando <b>{items.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, items.length)}</b> de <b>{items.length}</b> expedientes
          <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>
          <b className="current-page">{currentPage}</b>
          <button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>›</button>
        </div>
      </section>
    </>
  )
}