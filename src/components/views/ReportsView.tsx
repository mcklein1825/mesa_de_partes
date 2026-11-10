import { Expediente } from '../../types'
import {
  calculateAverageResolutionTime,
  exportReportToCSV,
  getAreaDestino,
  parseDate
} from '../../utils/expedienteHelpers'
import type { ExpedienteRiskAnalysis } from '../../utils/expedienteRiskModel'
import StatCard from '../common/StatCard'
import RiskInsightPanel from '../common/RiskInsightPanel'
import { BarChart3, CheckCircle2, Clock3, Files } from 'lucide-react'

const statusSummary = [
  { status: 'Pendiente', label: 'Pendientes', className: 'report-status-pending' },
  { status: 'Sin respuesta', label: 'Sin respuesta', className: 'report-status-unanswered' },
  { status: 'Atendido', label: 'Atendidos', className: 'report-status-attended' },
  { status: 'Archivado', label: 'Archivados', className: 'report-status-archived' }
] as const

export default function ReportsView({
  expedientes,
  riskAnalysis,
  notify
}: {
  expedientes: Expediente[]
  riskAnalysis: ExpedienteRiskAnalysis
  notify: (message: string) => void
}) {
  const total = expedientes.length
  const avgTime = calculateAverageResolutionTime(expedientes)
  const areaCounts = new Map<string, number>()

  expedientes.forEach(expediente => {
    const area = getAreaDestino(expediente)
    areaCounts.set(area, (areaCounts.get(area) || 0) + 1)
  })

  const areaDistribution = [...areaCounts.entries()]
    .map(([area, count]) => ({
      area,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)

  const monthlyActivity = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date()
    monthDate.setDate(1)
    monthDate.setMonth(monthDate.getMonth() - (5 - index))
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const count = expedientes.filter(expediente => {
      const date = parseDate(expediente.fechaIngreso || '')
      return date?.getFullYear() === year && date.getMonth() === month
    }).length

    return {
      key: `${year}-${month}`,
      label: monthDate.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''),
      count
    }
  })
  const maxMonthlyCount = Math.max(1, ...monthlyActivity.map(item => item.count))

  const handleExport = () => {
    exportReportToCSV(expedientes)
    notify('Reporte exportado correctamente')
  }

  return (
    <>
      <div className="page-heading compact reports-heading">
        <div>
          <p className="eyebrow">ANÁLISIS Y SEGUIMIENTO</p>
          <h1>Reportes</h1>
          <p className="muted">Indicadores para una gestión documental más oportuna.</p>
        </div>
        <button className="outline-button" onClick={handleExport}>
          <span aria-hidden="true">↓</span> Exportar reporte
        </button>
      </div>

      <section className="stats-grid">
        <StatCard
          label="Total registrados"
          value={total}
          detail={`Año ${new Date().getFullYear()}`}
          tone="purple"
          icon={<Files size={20} aria-hidden="true" />}
        />
        <StatCard
          label="Pendientes"
          value={expedientes.filter(item => item.estado === 'Pendiente').length}
          detail="Por derivar o atender"
          tone="orange"
          icon={<Clock3 size={20} aria-hidden="true" />}
        />
        <StatCard
          label="Atendidos"
          value={expedientes.filter(item => item.estado === 'Atendido').length}
          detail="Con seguimiento"
          tone="green"
          icon={<CheckCircle2 size={20} aria-hidden="true" />}
        />
        <StatCard
          label="Tiempo promedio"
          value={avgTime}
          detail="Días de atención registrados"
          tone="blue"
          icon={<BarChart3 size={20} aria-hidden="true" />}
        />
      </section>

      <RiskInsightPanel analysis={riskAnalysis} />

      <div className="reports-grid">
        <section className="panel report-panel">
          <div className="panel-header">
            <div>
              <p className="report-section-kicker">CARGA DE TRABAJO</p>
              <h2>Expedientes por área</h2>
              <p>Distribución de los registros disponibles.</p>
            </div>
            <span className="report-total-badge">{total.toLocaleString('es-PE')} total</span>
          </div>

          {areaDistribution.length > 0 ? (
            <div className="report-area-list">
              {areaDistribution.map(({ area, count, percentage }, index) => (
                <div className="report-area-row" key={area}>
                  <div className="report-area-heading">
                    <span className="report-area-rank">{String(index + 1).padStart(2, '0')}</span>
                    <span className="report-area-name" title={area}>{area}</span>
                    <strong>{count.toLocaleString('es-PE')}</strong>
                  </div>
                  <div className="report-area-track">
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  <small>{percentage}% del total</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No hay expedientes para mostrar.</div>
          )}
        </section>

        <section className="panel report-status-panel">
          <div className="panel-header">
            <div>
              <p className="report-section-kicker">ESTADO DOCUMENTAL</p>
              <h2>Seguimiento de expedientes</h2>
              <p>Situación actual de los registros.</p>
            </div>
          </div>
          <div className="report-status-list">
            {statusSummary.map(({ status, label, className }) => {
              const count = expedientes.filter(item => item.estado === status).length
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0

              return (
                <div className={`report-status-row ${className}`} key={status}>
                  <div>
                    <span>{label}</span>
                    <strong>{count.toLocaleString('es-PE')}</strong>
                  </div>
                  <div className="report-status-track">
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  <small>{percentage}%</small>
                </div>
              )
            })}
          </div>
        </section>

        <section className="panel report-trend-panel">
          <div className="panel-header">
            <div>
              <p className="report-section-kicker">TENDENCIA RECIENTE</p>
              <h2>Ingresos por mes</h2>
              <p>Expedientes registrados en los últimos seis meses.</p>
            </div>
          </div>
          <div className="report-month-chart" aria-label="Gráfico de ingresos por mes">
            {monthlyActivity.map(({ key, label, count }) => (
              <div className="report-month-column" key={key}>
                <strong>{count}</strong>
                <div className="report-month-track">
                  <span style={{ height: `${Math.max(count > 0 ? 8 : 2, (count / maxMonthlyCount) * 100)}%` }} />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
