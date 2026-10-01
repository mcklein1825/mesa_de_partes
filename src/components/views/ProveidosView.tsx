import { useMemo, useState } from 'react'
import { Expediente, Proveido } from '../../types'
import ExpedienteSelector from '../common/ExpedienteSelector'
type Props = {
  proveidos: Proveido[]
  expedientes: Expediente[]
  areaOptions: string[]
  showSelector: boolean
  onNuevoProveido: () => void
  onCloseSelector: () => void
  onSelectExpediente: (expediente: Expediente) => void
}
export default function ProveidosView({
  proveidos,
  expedientes,
  areaOptions,
  showSelector,
  onNuevoProveido,
  onCloseSelector,
  onSelectExpediente
}: Props) {
  const [expedienteSeleccionado, setExpedienteSeleccionado] =
  useState<Expediente | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return proveidos.filter(proveido => {
      const coincideTexto =
        !texto ||
        proveido.nroExpediente.toLowerCase().includes(texto) ||
        proveido.areaDestino.toLowerCase().includes(texto) ||
        proveido.responsable.toLowerCase().includes(texto) ||
        proveido.instruccion.toLowerCase().includes(texto)

      const coincideEstado =
        estadoFiltro === 'Todos' ||
        proveido.estado === estadoFiltro

      return coincideTexto && coincideEstado
    })
  }, [proveidos, busqueda, estadoFiltro])

return (
  <>
    {showSelector && (
      <section className="panel" style={{ marginBottom: '16px' }}>
        <div className="panel-header">
          <div>
            <h2>Seleccionar expediente</h2>
            <p className="muted">
              Seleccione el expediente al que desea registrar el Proveído.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={onCloseSelector}
          >
            Cancelar
          </button>
        </div>

        <ExpedienteSelector
          expedientes={expedientes}
          value={expedienteSeleccionado}
          onChange={expediente => {
           if (expediente) {
    onSelectExpediente(expediente)
  }
}}
          areaOptions={areaOptions}
        />
      </section>
    )}

    <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Proveídos</h1>
          <p className="muted">
            Consulta y gestión de los proveídos vinculados a los expedientes.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
       onClick={() => {
          onNuevoProveido()
        }}  
        >
          ＋ Nuevo Proveído
        </button>
      </div>

      <section className="panel list-panel proveidos-list">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por proveído, expediente, área o instrucción..."
            />
          </div>

          <select
            value={estadoFiltro}
            onChange={e => setEstadoFiltro(e.target.value)}
          >
            <option value="Todos">
              Todos los estados
            </option>

            <option value="Pendiente">
              Pendiente
            </option>

            <option value="Atendido">
              Atendido
            </option>

            <option value="Archivado">
              Archivado
            </option>
          </select>

          <span className="result-count">{resultados.length} resultados</span>
        </div>

      <div className="table-wrap">
        <table className="data-table proveidos-table">
          <thead>
            <tr>
              <th>Expediente</th>
              <th>Fecha</th>
              <th>Área destino</th>
              <th>Responsable</th>
              <th>Instrucción</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {resultados.map(proveido => (
              <tr key={proveido.id}>
                <td>
                  <strong>
                    {proveido.nroExpediente || '—'}
                  </strong>
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

            {resultados.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    {busqueda || estadoFiltro !== 'Todos'
                      ? 'No se encontraron proveídos con esos criterios.'
                      : 'No hay proveídos registrados.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        Mostrando {resultados.length} de {proveidos.length} proveído
        {proveidos.length === 1 ? '' : 's'}.
      </div>
      </section>
    </>
  )
}
