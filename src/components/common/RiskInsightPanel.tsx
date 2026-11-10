import { BrainCircuit, CalendarClock, CircleAlert, Info, TrendingUp } from 'lucide-react'
import type { ExpedienteRiskAnalysis } from '../../utils/expedienteRiskModel'
import { formatNroExp } from '../../utils/expedienteHelpers'

export default function RiskInsightPanel({
  analysis,
  onViewAll,
  compact = false
}: {
  analysis: ExpedienteRiskAnalysis
  onViewAll?: () => void
  compact?: boolean
}) {
  const cases = compact ? analysis.predictions.slice(0, 5) : analysis.predictions

  return (
    <section className={`panel risk-insight-panel${compact ? ' compact-risk-panel' : ''}`}>
      <div className="risk-insight-header">
        <div className="risk-insight-title">
          <span className="risk-insight-icon"><BrainCircuit size={19} /></span>
          <div>
            <div className="risk-insight-eyebrow">
              <span>ANÁLISIS PREDICTIVO</span>
              <span className="risk-pilot-tag">PILOTO ML</span>
            </div>
            <h2>Riesgo estimado de atraso</h2>
            <p>Alertas preventivas para priorizar el seguimiento de plazos.</p>
          </div>
        </div>
        {analysis.status === 'ready' && (
          <div className="risk-summary">
            <strong>{analysis.highRiskCases}</strong>
            <span>riesgo alto</span>
          </div>
        )}
      </div>

      <div className="risk-model-meta">
        {analysis.status === 'ready' ? (
          <>
            <span><TrendingUp size={14} /> Regresión Ridge</span>
            <span>{analysis.historicalCases.toLocaleString('es-PE')} historiales confiables</span>
            <span>Validación temporal: {analysis.validationCases} casos</span>
            <span>MAE: {analysis.meanAbsoluteError} días · referencia: {analysis.baselineMeanAbsoluteError} días</span>
          </>
        ) : analysis.status === 'underperforming' ? (
          <>
            <span><Info size={14} /> Modelo en calibración</span>
            <span>{analysis.historicalCases.toLocaleString('es-PE')} historiales confiables</span>
            <span>MAE: {analysis.meanAbsoluteError} días · referencia: {analysis.baselineMeanAbsoluteError} días</span>
          </>
        ) : (
          <>
            <span><Info size={14} /> Modelo en preparación</span>
            <span>{analysis.historicalCases.toLocaleString('es-PE')} cierres con fecha verificable</span>
            <span>Se requieren al menos 50 para evaluar el piloto</span>
          </>
        )}
      </div>

      {analysis.status === 'ready' ? (
        cases.length > 0 ? (
          <div className="risk-table-wrap">
            <table className="risk-table">
              <caption className="sr-only">Análisis de riesgo de expedientes</caption>
              <thead>
                <tr>
                  <th scope="col">EXPEDIENTE</th>
                  <th scope="col">ÁREA Y TIPO</th>
                  <th scope="col">ESTIMACIÓN</th>
                  <th scope="col">PLAZO RESTANTE</th>
                  <th scope="col">RIESGO</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(item => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {formatNroExp(item.nroExp, false, item.fechaIngreso)}
                      </strong>
                      <span className="risk-subject" title={item.asunto}>{item.asunto}</span>
                    </td>
                    <td>
                      <strong>{item.area}</strong>
                      <span className="risk-secondary">{item.tipoDocumento}</span>
                    </td>
                    <td><strong>{item.estimatedDays} días</strong></td>
                    <td>
                      <strong>{item.daysRemaining === 0 ? 'Vence hoy' : `${item.daysRemaining} días`}</strong>
                      <span className="risk-secondary">de {item.availableDays} días asignados</span>
                    </td>
                    <td>
                      <span className={`risk-level ${item.riskPercentage >= 60 ? 'risk-high' : 'risk-medium'}`}>
                        <CircleAlert size={14} />
                        {item.riskPercentage}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {onViewAll && (
              <button type="button" className="risk-view-all" onClick={onViewAll}>
                Revisar expedientes <span>→</span>
              </button>
            )}
          </div>
        ) : (
          <div className="risk-empty">
            <CalendarClock size={19} />
            <span>
              {analysis.unscorableCases > 0
                ? 'Hay expedientes activos, pero los casos históricos comparables no son suficientes para estimar su riesgo.'
                : 'No se identifican expedientes próximos a vencer con riesgo elevado.'}
            </span>
          </div>
        )
      ) : (
        <div className="risk-model-notice" role="status">
          <Info size={17} />
          <p>
            {analysis.status === 'underperforming'
              ? 'La validación con casos históricos recientes no supera el promedio de referencia. Se ocultan las predicciones hasta que el modelo sea más confiable.'
              : 'No se mostrarán predicciones hasta reunir suficientes cierres con fechas reales de ingreso y atención. Las alertas de vencimiento por fecha siguen disponibles.'}
          </p>
        </div>
      )}

      <details className="risk-methodology">
        <summary>Cómo se calcula</summary>
        <p>
          El piloto usa una regresión Ridge local. Considera área, tipo documental, prioridad, canal de recepción, folios, anexos y fecha de ingreso. Solo aprende de expedientes cerrados con fechas reales; se valida con los casos cronológicamente más recientes y se compara con el promedio histórico. El riesgo es una estimación de apoyo, no una decisión automática ni una notificación enviada.
        </p>
      </details>
    </section>
  )
}
