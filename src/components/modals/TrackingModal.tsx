import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Inbox,
  Layers3,
  MapPin,
  Paperclip,
  Send,
  UserCheck,
  UserRound,
  X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Expediente, Memo, Oficio, Proveido, MemorandoMultiple } from '../../types'
import {
  formatNroExp,
  getRemitenteNombre,
  getAreaDestino,
  createInitialHistory,
  formatDateTime,
  displayDate,
  getDeadlineState,
  parseDate
} from '../../utils/expedienteHelpers'
import { formatDocumentNumber } from '../../utils/documentHelpers'
import StatusBadge from '../common/StatusBadge'
import DocumentLink from '../common/DocumentLink'
import MemoDocumentLink from '../common/MemoDocumentLink'
import Modal from '../common/Modal'

const TABLA_POR_DOCUMENTO: Record<string, string> = {
  Memo: 'memos',
  Oficio: 'oficios',
  'Proveído': 'proveidos',
  'Memorando múltiple': 'memorandos_multiples'
}
const tablaDe = (nombre: string): string | undefined => TABLA_POR_DOCUMENTO[nombre]

const iconoDeMovimiento = (accion: string): LucideIcon => {
  const texto = (accion || '').toLowerCase()
  if (/archivado/.test(texto)) return CheckCircle2
  if (/atendido|atendida/.test(texto)) return CheckCircle2
  if (/adjunt/.test(texto)) return Paperclip
  if (/oficio/.test(texto)) return Send
  if (/prove[ií]do/.test(texto)) return ClipboardList
  if (/derivado|enviado/.test(texto)) return ArrowRight
  if (/registro|pendiente|solo registro/.test(texto)) return Inbox
  return FileText
}

type FilaRelacionada = {
  key: string
  titulo: string
  lineas: string[]
  archivoData?: string
  archivo?: string
  nombreDocumento: string
  id: string
}

type GrupoRelacion = {
  nombre: string
  icon: LucideIcon
  filas: FilaRelacionada[]
}

function FilaDocumento({
  icon: Icono,
  titulo,
  lineas,
  archivoData,
  archivo,
  nombreDocumento,
  id
}: {
  icon: LucideIcon
  titulo: string
  lineas: string[]
  archivoData?: string
  archivo?: string
  nombreDocumento: string
  id: string
}) {
  return (
    <div className="tracking-doc-row">
      <span className="tracking-doc-icon"><Icono size={16} aria-hidden="true" /></span>
      <div className="tracking-doc-info">
        <strong>{titulo}</strong>
        {lineas.filter(Boolean).map((linea, indice) => <small key={indice}>{linea}</small>)}
      </div>
      {archivoData ? (
        <MemoDocumentLink tabla={tablaDe(nombreDocumento)} id={id} archivo={archivo} documento={nombreDocumento}>
          {archivo || 'Abrir documento'}
        </MemoDocumentLink>
      ) : (
        <span className="tracking-doc-na">Sin adjunto</span>
      )}
    </div>
  )
}

export default function TrackingModal({
  item,
  memos,
  oficios,
  proveidos,
  memorandosMultiples = [],
  onAttachDocument,
  onClose
}: {
  item?: Expediente
  memos: Memo[]
  oficios: Oficio[]
  proveidos: Proveido[]
  memorandosMultiples?: MemorandoMultiple[]
  onAttachDocument: (file: File) => Promise<void>
  onClose: () => void
}) {
  if (!item) return null

  const history = [...(item.historial || createInitialHistory(item))].reverse()
  const initialEntry = history[history.length - 1]
  const relatedMemos = memos.filter(m => String(m.expedienteId) === String(item.id))
  const relatedOficios = oficios.filter(o => String(o.expedienteId) === String(item.id))
  const relatedProveidos = proveidos.filter(p => String(p.expedienteId) === String(item.id))
  const relatedMemorandos = memorandosMultiples.filter(m => String(m.expedienteId) === String(item.id))

  const grupos: GrupoRelacion[] = [
    {
      nombre: 'Memorandos',
      icon: FileText,
      filas: relatedMemos.map(m => ({
        key: `memo-${m.id}`,
        titulo: `Memo ${formatDocumentNumber(m.nroMemo, m.createdAt) || 'sin número'}`,
        lineas: [
          `${m.asunto || 'Sin asunto'} · ${m.fecha || 'Sin fecha'}`,
          `Realizado por: ${m.realizadoPor || 'No registrado'} · Responsable: ${m.responsable || '—'}`,
          m.enviaCopia && m.destinatarioCopia ? `Con copia a: ${m.destinatarioCopia}` : ''
        ],
        archivoData: m.archivoData,
        archivo: m.archivo,
        nombreDocumento: 'Memo', id: String(m.id)
      }))
    },
    {
      nombre: 'Oficios',
      icon: Send,
      filas: relatedOficios.map(o => ({
        key: `oficio-${o.id}`,
        titulo: `Oficio ${formatDocumentNumber(o.nRegistro, o.createdAt) || 'sin número'}`,
        lineas: [
          `${[o.asuntoTipo, o.asuntoDetalle].filter(Boolean).join(' · ') || 'Sin asunto'} · ${o.fecha || 'Sin fecha'}`,
          `Destinatario: ${o.destinatario || '—'} · ${o.areaDestino || 'Sin área'}`,
          `Realizado por: ${o.realizadoPor || 'No registrado'}`
        ],
        archivoData: o.archivoData,
        archivo: o.archivo,
        nombreDocumento: 'Oficio', id: String(o.id)
      }))
    },
    {
      nombre: 'Proveídos',
      icon: ClipboardList,
      filas: relatedProveidos.map(p => ({
        key: `proveido-${p.id}`,
        titulo: `Proveído ${formatDocumentNumber(p.id, p.createdAt)}`,
        lineas: [
          `${p.instruccion || 'Sin instrucción'} · ${p.fecha || 'Sin fecha'}`,
          `Destino: ${p.areaDestino || '—'} · Realizado por: ${p.realizadoPor || 'No registrado'}`
        ],
        archivoData: p.archivoData,
        archivo: p.archivo,
        nombreDocumento: 'Proveído', id: String(p.id)
      }))
    },
    {
      nombre: 'Memorandos múltiples',
      icon: Layers3,
      filas: relatedMemorandos.map(mm => ({
        key: `memorando-multiple-${mm.id}`,
        titulo: `Memorando múltiple ${mm.nroRegistro || 'sin número'}`,
        lineas: [
          `${mm.asunto || 'Sin asunto'} · ${mm.fecha || 'Sin fecha'} · ${mm.destinatarios.length} ${mm.destinatarios.length === 1 ? 'destinatario' : 'destinatarios'}`,
          `Realizado por: ${mm.realizadoPor || 'No registrado'}`,
          `Destinatarios: ${mm.destinatarios.map(d => d.nombre).join(', ') || 'Sin destinatarios'}`
        ],
        archivoData: mm.archivoData,
        archivo: mm.archivo,
        nombreDocumento: 'Memorando múltiple', id: String(mm.id)
      }))
    }
  ]
  const gruposConFilas = grupos.filter(g => g.filas.length > 0)

  const deadline = getDeadlineState(item)
  const numero = formatNroExp(item.nroExp, false, item.fechaIngreso)
  const tienePrincipal = Boolean(item.archivo && item.archivo !== 'Sin adjunto')
  const elementos =
    Number(tienePrincipal) +
    relatedMemos.length +
    relatedOficios.length +
    relatedProveidos.length +
    relatedMemorandos.length
  const estadoVisible =
    !item.requiereGestion && item.estado === 'Pendiente' ? 'Solo registro' : item.estado

  const fechaPartes = (value: string) => {
    const date = parseDate(value)
    if (!date) return { fecha: value || 'Fecha no registrada', hora: '' }
    const texto = formatDateTime(value)
    const [fecha, hora] = texto.split(' ')
    return { fecha, hora: hora || '' }
  }

  return (
    <Modal
      titleId="tracking-title"
      onClose={onClose}
      className="tracking-modal"
      overlayClassName="modal-backdrop"
      initialFocus="container"
    >
      <header className="tracking-hero">
        <div className="tracking-hero-main">
          <p className="eyebrow">RUTA DEL EXPEDIENTE</p>
          <h2 id="tracking-title" className="tracking-folio">
            {numero || 'Expediente sin número asignado'}
            {item.esDuplicado && <span className="tracking-dup" title="Expediente duplicado"> *</span>}
          </h2>
          <p className="tracking-subject">{item.asunto || 'Sin asunto registrado'}</p>
        </div>
        <div className="tracking-hero-side">
          <StatusBadge status={estadoVisible} />
          {item.prioridad === 'Alta' && <span className="tracking-chip-alta">Prioridad alta</span>}
          <button className="modal-close" onClick={onClose} aria-label="Cerrar seguimiento">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="tracking-body">
        <section className="tracking-meta" aria-label="Datos del expediente">
          <div className="tracking-meta-item">
            <UserRound size={15} aria-hidden="true" />
            <div>
              <span>Remitente</span>
              <strong>{getRemitenteNombre(item) || 'No registrado'}</strong>
            </div>
          </div>
          <div className="tracking-meta-item">
            <MapPin size={15} aria-hidden="true" />
            <div>
              <span>Ubicación actual</span>
              <strong>{getAreaDestino(item)}</strong>
            </div>
          </div>
          <div className="tracking-meta-item">
            <CalendarClock size={15} aria-hidden="true" />
            <div>
              <span>Fecha límite</span>
              <strong>
                {item.plazo ? displayDate(item.plazo) : 'Sin plazo'}
                {deadline.kind === 'vencido' && (
                  <em className="tracking-overdue">{deadline.label}</em>
                )}
              </strong>
            </div>
          </div>
          <div className="tracking-meta-item">
            <UserCheck size={15} aria-hidden="true" />
            <div>
              <span>Recibido por</span>
              <strong>
                {initialEntry?.responsable || item.usuarioRegistro || 'No registrado'}
              </strong>
            </div>
          </div>
          <div className="tracking-meta-item">
            <CalendarDays size={15} aria-hidden="true" />
            <div>
              <span>Fecha de recepción</span>
              <strong>
                {formatDateTime(
                  initialEntry?.fechaHora || item.fechaHoraRecepcion || item.fechaIngreso || ''
                ) || 'No registrada'}
              </strong>
            </div>
          </div>
          <div className="tracking-meta-item">
            <ClipboardList size={15} aria-hidden="true" />
            <div>
              <span>Tipo de trámite</span>
              <strong>{item.requiereGestion ? 'Requiere gestión' : 'Solo registro'}</strong>
            </div>
          </div>
        </section>

        <section className="tracking-docs" aria-labelledby="tracking-docs-title">
          <div className="tracking-docs-header">
            <div>
              <p className="eyebrow">EXPEDIENTE DIGITAL</p>
              <h3 id="tracking-docs-title">Documentos relacionados</h3>
            </div>
            <span className="tracking-docs-count">
              {elementos} {elementos === 1 ? 'elemento' : 'elementos'}
            </span>
          </div>

          <div className="tracking-docs-list">
            <div className="tracking-doc-row">
              <span className="tracking-doc-icon"><FileText size={16} aria-hidden="true" /></span>
              <div className="tracking-doc-info">
                <strong>Documento de ingreso</strong>
              </div>
              <DocumentLink item={item} onAttach={file => onAttachDocument(file)} soloBoton />
            </div>

            {item.documentos && (
              <div className="tracking-doc-row">
                <span className="tracking-doc-icon"><ClipboardList size={16} aria-hidden="true" /></span>
                <div className="tracking-doc-info">
                  <strong>Documentos declarados al recibir</strong>
                  <small>{item.documentos}</small>
                </div>
              </div>
            )}

            {gruposConFilas.map(g => {
              const IconoGrupo = g.icon
              return (
                <div key={g.nombre}>
                  <div className="tracking-doc-group">
                    <IconoGrupo size={14} aria-hidden="true" />
                    <span>{g.nombre}</span>
                    <em>{g.filas.length}</em>
                  </div>
                  {g.filas.map(f => (
                    <FilaDocumento
                      key={f.key}
                      icon={g.icon}
                      titulo={f.titulo}
                      lineas={f.lineas}
                      archivoData={f.archivoData}
                      archivo={f.archivo}
                      nombreDocumento={f.nombreDocumento} id={f.id}
                    />
                  ))}
                </div>
              )
            })}

            {elementos === 0 && (
              <div className="tracking-docs-empty">
                Este expediente aún no tiene documentos relacionados.
              </div>
            )}
          </div>
        </section>

        <section className="tracking-history" aria-label="Cronología del expediente">
          <div className="tracking-history-header">
            <p className="eyebrow">TRAZABILIDAD</p>
            <h3>Cronología de movimientos</h3>
          </div>

          <ol className="tracking-timeline">
            {history.map((entry, index) => {
              const accion = String(entry.accion || 'Movimiento registrado')
              const esInicial = index === history.length - 1
              const esUltimo = index === 0 && !esInicial
              const Icono = iconoDeMovimiento(accion)
              const { fecha, hora } = fechaPartes(entry.fechaHora || entry.fechaIngreso || '')
              const esProveido = /prove[ií]do/i.test(`${accion} ${entry.observacion || ''}`)

              return (
                <li
                  key={`${entry.fechaHora}-${index}`}
                  className={`tracking-event${esInicial ? ' is-initial' : ''}${esUltimo ? ' is-latest' : ''}`}
                >
                  <span className="tracking-event-marker" aria-hidden="true">
                    {history.length - index}
                  </span>

                  <article className="tracking-event-card">
                    <header className="tracking-event-head">
                      <div className="tracking-event-title">
                        <span className="tracking-event-step">
                          {esInicial ? 'REGISTRO INICIAL' : `MOVIMIENTO ${history.length - index}`}
                          {esUltimo && <em className="tracking-latest-tag">ÚLTIMO</em>}
                        </span>
                        <strong>
                          <Icono size={15} aria-hidden="true" />
                          {accion}
                        </strong>
                      </div>
                      <time className="tracking-event-time">
                        <b>{fecha}</b>
                        {hora && <span>{hora}</span>}
                      </time>
                    </header>

                    {esInicial ? (
                      <div className="tracking-event-initial">
                        <span>EXPEDIENTE RECIBIDO EN</span>
                        <strong>{entry.areaDestino || entry.areaOrigen || 'Dirección General'}</strong>
                      </div>
                    ) : (
                      <div className="tracking-event-route">
                        <div className="tracking-event-place">
                          <span>ORIGEN</span>
                          <strong>{entry.areaOrigen || 'No especificado'}</strong>
                        </div>
                        <ArrowRight size={18} className="tracking-event-arrow" aria-hidden="true" />
                        <div className="tracking-event-place is-destination">
                          <span>DESTINO</span>
                          <strong>{entry.areaDestino || 'No especificado'}</strong>
                        </div>
                      </div>
                    )}

                    <div className="tracking-event-people">
                      <div className="tracking-person">
                        <span>{esProveido ? 'Responsable' : 'Realizado por'}</span>
                        <strong>{entry.responsable || 'No registrado'}</strong>
                      </div>
                      {entry.responsableDestino && (
                        <div className="tracking-person">
                          <span>Responsable destino</span>
                          <strong>{entry.responsableDestino}</strong>
                        </div>
                      )}
                    </div>

                    {entry.observacion && (
                      <div className="tracking-event-note">
                        <span>DETALLE DEL MOVIMIENTO</span>
                        <p>{entry.observacion}</p>
                      </div>
                    )}
                  </article>
                </li>
              )
            })}
          </ol>
        </section>
      </div>

      <footer className="tracking-footer">
        <span>
          {elementos} {elementos === 1 ? 'documento' : 'documentos'} ·{' '}
          {history.length} {history.length === 1 ? 'movimiento' : 'movimientos'}
        </span>
        <button className="outline-button" onClick={onClose}>Cerrar</button>
      </footer>
    </Modal>
  )
}
