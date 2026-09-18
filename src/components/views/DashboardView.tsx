import { Expediente } from '../../types'
import { formatNroExp, getRemitenteNombre, getAreaDestino, daysUntilDeadline } from '../../utils/expedienteHelpers'
import StatCard from '../common/StatCard'
import StatusBadge from '../common/StatusBadge'

export default function DashboardView({
  expedientes,
  onNew,
  onViewAll,
  currentDate
}: {
  expedientes: Expediente[]
  onNew: () => void
  onViewAll: () => void
  currentDate: string
}) {
  const pending = expedientes.filter(item => item.estado === 'Pendiente').length
  const attention = expedientes.filter(item => item.estado === 'En atención').length
  const attended = expedientes.filter(item => item.estado === 'Atendido').length

  const upcomingDeadlines = expedientes
    .filter(item => (item.estado === 'Pendiente' || item.estado === 'En atención') && item.plazo)
    .map(item => ({ ...item, daysLeft: daysUntilDeadline(item.plazo) }))
    .filter(item => item.daysLeft >= 0 && item.daysLeft <= 15)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3)

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr.split('/').reverse().join('-'))
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
          <h1>Buenos días, Lucía <span>👋</span></h1>
          <p className="muted">Aquí tienes el resumen de tu mesa de partes.</p>
        </div>
        <button className="primary-button" onClick={onNew}>＋ Nuevo expediente</button>
      </div>

      <section className="stats-grid">
        <StatCard label="Por atender" value={pending} detail="Requieren derivación" tone="orange" icon="◷" />
        <StatCard label="En atención" value={attention} detail="En las áreas responsables" tone="blue" icon="" />
        <StatCard label="Atendidos" value={attended} detail="Registros con seguimiento" tone="green" icon="✓" />
        <StatCard label="Total de expedientes" value={expedientes.length} detail={`Año ${new Date().getFullYear()}`} tone="purple" icon="▤" />
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {expedientes.slice(0, 4).map(item => (
                  <tr key={item.id}>
                    <td>
                      <b className="exp-id">{formatNroExp(item.nroExp)}</b>
                      <small>{item.fecha}</small>
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
                    <td><button className="dots">•••</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel deadlines-panel">
          <div className="panel-header">
            <div>
              <h2>Próximos vencimientos</h2>
              <p>Expedientes que requieren atención</p>
            </div>
            <span className="warning-icon">!</span>
          </div>

          <div className="deadline-list">
            {upcomingDeadlines.length > 0 ? (
              upcomingDeadlines.map(item => {
                const { day, month } = formatDateShort(item.plazo)
                return (
                  <div className="deadline-item" key={item.id}>
                    <div className={`deadline-date ${item.daysLeft <= 3 ? 'urgent' : ''}`}>
                      <b>{day}</b>
                      <span>{month}</span>
                    </div>
                    <div>
                      <b>{formatNroExp(item.nroExp)}</b>
                      <p>{item.asunto}</p>
                      <small>
                        {item.daysLeft === 0 ? 'Vence hoy' : item.daysLeft === 1 ? 'Vence mañana' : `Vence en ${item.daysLeft} días`}
                      </small>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>
                No hay vencimientos próximos
              </div>
            )}
          </div>

          <button className="outline-button" onClick={onViewAll}>Ver calendario de vencimientos</button>
        </section>
      </div>
    </>
  )
}