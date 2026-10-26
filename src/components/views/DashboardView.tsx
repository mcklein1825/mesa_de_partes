import { Expediente, Proveido } from '../../types'
import { formatNroExp, getRemitenteNombre, getAreaDestino, getDeadlineState, parseDate } from '../../utils/expedienteHelpers'
import StatCard from '../common/StatCard'
import StatusBadge from '../common/StatusBadge'

export default function DashboardView({
  expedientes,
  proveidos,
  onNew,
  onViewAll,
  onFilterExp,
  currentDate,
  currentUser
}: {
  expedientes: Expediente[]
  proveidos: Proveido[]
  onNew: () => void
  onViewAll: () => void
  onFilterExp?: (status: string) => void
  currentDate: string
  currentUser?: {
    nombre?: string
  } | null
}) {
const pending = expedientes.filter(
  item => item.estado === 'Pendiente'
).length

const noResponse = expedientes.filter(
  item => item.estado === 'Sin respuesta'
).length

const attended = expedientes.filter(
  item => item.estado === 'Atendido'
).length

const archived = expedientes.filter(
  item => item.estado === 'Archivado'
).length

  const upcomingDeadlines = expedientes
    .filter(item =>
      (item.estado === 'Pendiente' || item.estado === 'Sin respuesta') &&
      item.plazo
    )
    .map(item => ({
      ...item,
      deadline: getDeadlineState(item)
    }))
    .filter(item =>
      item.deadline.kind === 'vencido' ||
      item.deadline.kind === 'por_vencer' ||
      (item.deadline.kind === 'vigente' && (item.deadline.daysLeft ?? 999) <= 15)
    )
    .sort((a, b) => {
      const da = a.deadline.daysLeft ?? 0
      const db = b.deadline.daysLeft ?? 0
      return da - db
    })
    .filter((item, index, array) =>
      index === array.findIndex(other => other.nroExp === item.nroExp)
    )
    .slice(0, 10)
  const recentExpedientes = [...expedientes]
    .sort((a, b) => {
      const dateA = parseDate(a.fechaIngreso || '')?.getTime() ?? 0
      const dateB = parseDate(b.fechaIngreso || '')?.getTime() ?? 0
      return dateB - dateA
    })
    .slice(0, 4)

  const formatDateShort = (dateStr: string) => {
    const date = parseDate(dateStr)
    if (!date) return { day: '—', month: '' }
    return {
      day: date.getDate(),
      month: date.toLocaleString('es-PE', { month: 'short' }).toUpperCase()
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{currentDate}</p>
          <h1>Buenos días, {currentUser?.nombre || 'usuario'} </h1>
          <p className="muted">Aquí tienes el resumen de tu mesa de partes.</p>
        </div>
        <button className="primary-button" onClick={onNew}>＋ Nuevo expediente</button>
      </div>

      <section className="stats-grid">
        <StatCard
          label="Por atender"
          value={pending}
          detail="Pendientes de gestión"
          tone="orange"
          icon="◷"
          onClick={() => onFilterExp?.('Pendiente')}

        />

        <StatCard
          label="Sin respuesta"
          value={noResponse}
          detail="Requieren seguimiento"
          tone="blue"
          icon="!"
          onClick={() => onFilterExp?.('Sin respuesta')}

        />

        <StatCard
          label="Atendidos"
          value={attended}
          detail="Registros atendidos"
          tone="green"
          icon="✓"
          onClick={() => onFilterExp?.('Atendido')}

        />

        <StatCard
          label="Archivados"
          value={archived}
          detail="Expedientes cerrados"
          tone="purple"
          icon="▤"
          onClick={() => onFilterExp?.('Archivado')}

        />
      </section>

      <div className="content-grid">
        <section className="panel recent-panel">
          <div className="panel-header">
            <div>
              <h2>Expedientes recientes</h2>
              <p>Últimos documentos registrados en el sistema</p>
            </div>
            <button className="text-button" onClick={onViewAll}>Ver todos <span>→</span></button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>N° DE EXPEDIENTE</th>
                  <th>REMITENTE</th>
                  <th>ASUNTO</th>
                  <th>ÁREA DESTINO</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {recentExpedientes.map(item => (
                  <tr key={item.id}>
                    <td>
                      <b className="exp-id">{formatNroExp(item.nroExp)}</b>
                      <small>{item.fechaIngreso || 'Sin fecha'}</small>
                    </td>
                    <td>
                      <span className="person-cell">
                        <span className="small-avatar">
                          {getRemitenteNombre(item).split(' ').map(x => x[0]).slice(0, 2).join('')}
                        </span>
                        {getRemitenteNombre(item)}
                      </span>
                    </td>
                    <td>{item.asunto}</td>
                    <td>{getAreaDestino(item)}</td>
                    <td><StatusBadge status={item.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel deadlines-panel">
          <div className="panel-header">
            <div>
              <h2>Vencimientos y plazos</h2>
              <p>Expedientes próximos a vencer o con plazo vencido</p>
            </div>
            <span className="warning-icon">!</span>
          </div>

          <div className="deadline-list">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map(item => {
                const { day, month } = formatDateShort(item.plazo)
                return (
                  <div className="deadline-item" key={item.id}>
                    <div
                      className={`deadline-date ${
                        item.deadline.kind === 'vencido'
                          ? 'overdue'
                          : item.deadline.kind === 'por_vencer'
                            ? 'urgent'
                            : ''
                      }`}
                    >
                      <b>{day}</b>
                      <span>{month}</span>
                    </div>
                    <div>
                      <b>{formatNroExp(item.nroExp)}</b>
                      <p>{item.asunto}</p>
                      <small
                        className={
                          item.deadline.kind === 'vencido' ? 'overdue' : ''
                        }
                      >
                        {item.deadline.label}
                      </small>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>
                No hay expedientes con plazos que requieran atención
              </div>
            )}
          </div>
          <button className="outline-button" onClick={onViewAll}>Ver todos los expedientes</button>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Proveídos recientes</h2>
            <p>Últimas instrucciones registradas en los expedientes</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EXPEDIENTE</th>
                <th>FECHA</th>
                <th>ÁREA DESTINO</th>
                <th>RESPONSABLE</th>
                <th>INSTRUCCIÓN</th>
                <th>ESTADO</th>
              </tr>
            </thead>

            <tbody>
              {proveidos.slice(0, 4).map(proveido => (
                <tr key={proveido.id}>
                 <td>
                    <b className="exp-id">
                      {proveido.nroExpediente || '—'}
                    </b>
                  </td>

                  <td>
                    {proveido.fecha || '—'}
                  </td>

                  <td>
                    {proveido.areaDestino || '—'}
                  </td>

                  <td>
                    {proveido.responsable || '—'}
                  </td>

                  <td>
                    {proveido.instruccion || '—'}
                  </td>

                  <td>
                    <span
                      className={`status-badge status-${proveido.estado
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                    >
                      {proveido.estado || '—'}
                    </span>
                  </td>
                </tr>
              ))}

              {proveidos.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div
                      className="empty-state"
                      style={{ padding: '20px', textAlign: 'center' }}
                    >
                      No hay proveídos recientes para mostrar.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

    </>
  )
}