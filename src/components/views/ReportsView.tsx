import { Expediente } from '../../types'
import { areas } from '../../constants'
import { calculateAverageResolutionTime, exportReportToCSV, getAreaDestino } from '../../utils/expedienteHelpers'
import StatCard from '../common/StatCard'

export default function ReportsView({
  expedientes, notify
}: {
  expedientes: Expediente[]
  notify: (message: string) => void
}) {
  const total = expedientes.length
  const avgTime = calculateAverageResolutionTime(expedientes)

  const areaDistribution = areas
    .map(area => {
      const count = expedientes.filter(e => getAreaDestino(e) === area).length
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0
      return { area, count, percentage }
    })
    .filter(item => item.count > 0)

  const handleExport = () => {
    exportReportToCSV(expedientes)
    notify('Reporte exportado correctamente')
  }

  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">ANÁLISIS Y SEGUIMIENTO</p>
          <h1>Reportes</h1>
          <p className="muted">Indicadores de gestión de la mesa de partes.</p>
        </div>
        <button className="outline-button" onClick={handleExport}>↓ Exportar reporte</button>
      </div>

      <section className="stats-grid">
        <StatCard label="Total registrados" value={total} detail={`Año ${new Date().getFullYear()}`} tone="purple" icon="▤" />
        <StatCard label="Pendientes" value={expedientes.filter(item => item.estado === 'Pendiente').length} detail="Por derivar" tone="orange" icon="◷" />
        <StatCard label="Atendidos" value={expedientes.filter(item => item.estado === 'Atendido').length} detail="Con seguimiento" tone="green" icon="✓" />
        <StatCard label="Tiempo promedio" value={avgTime} detail="Días de atención" tone="blue" icon="◴" />
      </section>

      <section className="panel report-panel">
        <div className="panel-header">
          <div>
            <h2>Distribución por área</h2>
            <p>Expedientes registrados durante el periodo actual</p>
          </div>
        </div>

        {areaDistribution.length > 0 ? (
          areaDistribution.map(({ area, count, percentage }) => (
            <div className="bar-row" key={area}>
              <span>{area}</span>
              <div><i style={{ width: `${percentage}%` }} /></div>
              <b>{count}</b>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ padding: '20px', textAlign: 'center' }}>No hay datos para mostrar</div>
        )}
      </section>
    </>
  )
}