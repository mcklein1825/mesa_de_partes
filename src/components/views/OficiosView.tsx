import { useMemo, useState } from 'react'
import { Expediente, Oficio } from '../../types'
import { formatNroExp } from '../../utils/expedienteHelpers'

type Props = {
  oficios: Oficio[]
  oficioExpediente: Expediente | null
  onNuevoOficio: () => void
}

export default function OficiosView({
  oficios,
  oficioExpediente,
  onNuevoOficio
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return oficios.filter(oficio => {
      const coincideTexto =
        !texto ||
        oficio.nRegistro.toLowerCase().includes(texto) ||
        oficio.nroExpediente.toLowerCase().includes(texto) ||
        oficio.asuntoDetalle.toLowerCase().includes(texto) ||
        oficio.destinatario.toLowerCase().includes(texto) ||
        oficio.areaDestino.toLowerCase().includes(texto)

      const coincideEstado =
        estadoFiltro === 'Todos' ||
        oficio.estado === estadoFiltro

      return coincideTexto && coincideEstado
    })
  }, [oficios, busqueda, estadoFiltro])

  return (
    <section className="view-section">
      <div className="page-header">
        <div>
          <h1>Oficios</h1>
          <p>
            Consulta y gestión de los oficios vinculados a los expedientes.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onNuevoOficio}
        >
          + Nuevo Oficio
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <span>⌕</span>
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por registro, expediente, asunto o destinatario..."
          />
        </div>

        <select
          value={estadoFiltro}
          onChange={e => setEstadoFiltro(e.target.value)}
        >
          <option value="Todos">Todos los estados</option>
          <option value="Enviado">Enviado</option>
          <option value="Recepcionado">Recepcionado</option>
          <option value="Atendido">Atendido</option>
          <option value="Anulado">Anulado</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>N.° Registro</th>
              <th>Expediente</th>
              <th>Fecha</th>
              <th>Destinatario</th>
              <th>Área destino</th>
              <th>Asunto</th>
              <th>Responsable</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {resultados.map(oficio => (
              <tr key={oficio.id}>
                <td>
                  <strong>{oficio.nRegistro}</strong>
                </td>

                <td>
                  <strong>
                    {oficio.nroExpediente
                      ? formatNroExp(oficio.nroExpediente)
                      : 'Sin expediente'}
                  </strong>
                </td>

                <td>{oficio.fecha || '-'}</td>

                <td>
                  {oficio.destinatario || '-'}
                </td>

                <td>
                  {oficio.areaDestino || '-'}
                </td>

                <td>
                  <div>
                    {oficio.asuntoTipo && (
                      <strong>{oficio.asuntoTipo}</strong>
                    )}

                    {oficio.asuntoDetalle && (
                      <div>{oficio.asuntoDetalle}</div>
                    )}

                    {!oficio.asuntoTipo &&
                      !oficio.asuntoDetalle && (
                        <span>-</span>
                      )}
                  </div>
                </td>

                <td>
                  {oficio.responsable || '-'}
                </td>

                <td>
                  <span
                    className={`status-badge status-${oficio.estado
                      .toLowerCase()
                      .replace(/\s+/g, '-')}`}
                  >
                    {oficio.estado}
                  </span>
                </td>
              </tr>
            ))}

            {resultados.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    {busqueda || estadoFiltro !== 'Todos'
                      ? 'No se encontraron oficios con esos criterios.'
                      : 'No hay oficios registrados.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="results-summary">
        Mostrando {resultados.length} de {oficios.length} oficio
        {oficios.length === 1 ? '' : 's'}.
      </div>
    </section>
  )
}