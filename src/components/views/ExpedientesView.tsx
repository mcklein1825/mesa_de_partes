import { useState } from 'react'
import { Expediente, Memo, Oficio, Proveido, Status } from '../../types'
import { formatNroExp, displayDate, getRemitenteNombre, getAreaDestino, getDeadlineState } from '../../utils/expedienteHelpers'
import DocumentLink from '../common/DocumentLink'
import StatusBadge from '../common/StatusBadge'
import DuplicateExpedienteModal from '../modals/DuplicateExpedienteModal'
import { Copy, Eye, Search } from 'lucide-react'

export default function ExpedientesView({
  items,
  total,
  currentPage,
  onPageChange,
  pageSize,
  query,
  setQuery,
  areaFilter,
  areaOptions,
  setAreaFilter,
  remitenteFilter,
  setRemitenteFilter,
  statusFilter,
  setStatusFilter,
  managementFilter,
  setManagementFilter,
  onNew,
  onTracking,
  onDuplicate,
  canRegister,
  canDuplicate,
  canEdit,
  memos,
  oficios,
  proveidos,
  expedienteDocumentos,
  onAttachDocument,
  onRegisterDate,
}: {

  items: Expediente[]
  memos: Memo[]
  oficios: Oficio[]
  proveidos: Proveido[]
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
  managementFilter: string
  setManagementFilter: (v: string) => void
  onNew: () => void
  onTracking: (id: string) => void
  onDuplicate: (expediente: Expediente) => void
  canRegister: boolean
  canDuplicate: boolean
  canEdit: boolean
  onAttachDocument: (
    id: string,
    file: File
  ) => Promise<void>

  onRegisterDate: (
    expedienteId: string,
    fecha: string
  ) => Promise<void>
    pageSize: number
}) {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [editingIngresoDateId, setEditingIngresoDateId] = useState<string | null>(null)
  const [ingresoDateDraft, setIngresoDateDraft] = useState('')
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

        {(canRegister || canDuplicate) && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {canRegister && (
              <button
                className="primary-button"
                onClick={onNew}
              >
                ＋ Nuevo expediente
              </button>
            )}

            {canDuplicate && (
              <button
                className="primary-button"
                onClick={() => setShowDuplicateModal(true)}
              >
                <Copy size={16} aria-hidden="true" /> Duplicar expediente
              </button>
            )}
          </div>
        )}
      </div>

      <section className="panel list-panel">
        <div className="toolbar">
          <div className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={e => {
                setQuery(e.target.value)
              }}
              placeholder="N.° expediente, remitente, asunto, área o documento..."
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
            <option value="Todas">Todas las áreas</option>
            {areaOptions.map(area => <option key={area}>{area}</option>)}
          </select>

          <select value={statusFilter}
           onChange={e => {
            setStatusFilter(e.target.value)
          }}>
            <option value="Todos">Todos los estados</option>
            <option>Vencidos</option>
            <option>Por vencer</option>
            <option>Pendiente</option>
            <option>Sin respuesta</option>
            <option>Atendido</option>
            <option>Archivado</option>
          </select>
          <select
            value={managementFilter}
            onChange={e => setManagementFilter(e.target.value)}
            aria-label="Filtrar por tipo de gestión"
          >
            <option value="Todos">Todos los tipos</option>
            <option value="gestion">Requiere gestión</option>
            <option value="registro">Solo registro</option>
          </select>
          {(query ||
            remitenteFilter ||
            areaFilter !== 'Todas' ||
            statusFilter !== 'Todos' ||
            managementFilter !== 'Todos') && (
            <button
              type="button"
              className="clear-filters-button"
              onClick={() => {
                setQuery('')
                setRemitenteFilter('')
                setAreaFilter('Todas')
                setStatusFilter('Todos')
                setManagementFilter('Todos')
              }}
            >
              Limpiar filtros
            </button>
          )}
          <span className="result-count">{total} resultados</span>
        </div>

        <div className="table-wrap">
          <table className="data-table expedientes-table">
            <caption className="sr-only">Listado de expedientes</caption>
            <thead>
              <tr>
                <th scope="col">N.° EXP</th>
                <th scope="col">FECHA</th>
                <th scope="col">FECHA LÍMITE</th>
                <th scope="col">NOMBRE / APELLIDO</th>
                <th scope="col">ASUNTO</th>
                <th scope="col">ESTADO</th>
                <th scope="col">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => {
                const deadline = getDeadlineState(item)
                return (
                  <tr key={item.id}>
                    <td data-label="N.° EXP">
                      <b className="exp-id">
                        {formatNroExp(item.nroExp, false, item.fechaIngreso)}
                        {item.esDuplicado ? ' *' : ''}
                      </b>
                    </td>

                    <td data-label="FECHA">
                      {item.fechaIngreso ? (
                        displayDate(item.fechaIngreso)
                      ) : editingIngresoDateId === String(item.id) ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            minWidth: '130px'
                          }}
                        >
                          <input
                            type="date"
                            value={ingresoDateDraft}
                            onChange={e => setIngresoDateDraft(e.target.value)}
                            aria-label="Registrar fecha de ingreso"
                          />

                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button
                              type="button"
                              disabled={!ingresoDateDraft}
                              onClick={async () => {
                                if (!ingresoDateDraft) return

                                await onRegisterDate(
                                  String(item.id),
                                  ingresoDateDraft
                                )

                                setEditingIngresoDateId(null)
                                setIngresoDateDraft('')
                              }}
                            >
                              Guardar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingIngresoDateId(null)
                                setIngresoDateDraft('')
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : canEdit ? (
                        <button
                          type="button"
                          title="Asignar fecha de ingreso"
                          onClick={() => {
                            setIngresoDateDraft('')
                            setEditingIngresoDateId(String(item.id))
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '5px 8px',
                            border: '1px solid var(--ui-border)',
                            borderRadius: '6px',
                            background: 'var(--ui-surface-muted)',
                            color: 'var(--ui-text-muted)',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Sin fecha
                        </button>
                      ) : <span>Sin fecha</span>}
                    </td>

                    <td data-label="FECHA LÍMITE">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '2px'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            color: item.plazo ? 'var(--ui-text-strong)' : 'var(--ui-text-muted)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {item.plazo
                            ? displayDate(item.plazo)
                            : 'Sin fecha límite'}
                        </span>
                        {item.plazo && deadline.label && (
                          <small
                            style={{
                              fontSize: '12px',
                              fontWeight: deadline.kind === 'vencido' ? 700 : 500,
                              color:
                                deadline.kind === 'vencido'
                                  ? 'var(--ui-danger)'
                                  : deadline.kind === 'por_vencer'
                                    ? 'var(--ui-warning)'
                                    : 'var(--ui-text-muted)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {deadline.label}
                          </small>
                        )}
                      </div>
                    </td>
                    <td data-label="NOMBRE / APELLIDO">
                      <span className="person-cell">
                        <span className="small-avatar">
                          {getRemitenteNombre(item).split(' ').map(x => x[0]).slice(0, 2).join('')}
                        </span>
                        <span className="table-cell-group">
                          {cell(
                            getRemitenteNombre(item),
                            'expediente-remitente'
                          )}
                          {/* AQUÍ MOSTRAMOS EL CARGO SI EXISTE */}
                          {item.cargoRepresentante && (
                            <small style={{ color: 'var(--ui-text-soft)', display: 'block', fontSize: '12px', marginTop: '2px' }}>
                              {item.cargoRepresentante}
                            </small>
                          )}
                        </span>
                      </span>
                    </td>
                   <td data-label="ASUNTO"
                      style={{
                        width: 'auto',
                        maxWidth: '100%',
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
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis'
                        }}
                        title={item.asunto}
                      >
                        <DocumentLink
                          item={item}
                          onAttach={canRegister
                            ? file => onAttachDocument(item.id, file)
                            : undefined}
                        >
                          {item.asunto}
                        </DocumentLink>
                      </span>
                    </td>
                    <td data-label="ESTADO">
                      <StatusBadge
                        status={
                          !item.requiereGestion && item.estado === 'Pendiente'
                            ? 'Solo registro'
                            : item.estado
                        }
                      />
                    </td>

                    <td className="actions-cell" data-label="ACCIONES">

                      <button
                        className="tracking-button"
                        onClick={() => onTracking(item.id)}
                      >

                      <Eye size={16} aria-hidden="true" /> Ver seguimiento
                    </button>


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
            requiereGestion: true,
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