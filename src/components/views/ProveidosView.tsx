import { useMemo, useState } from 'react'

type Proveido = {
  id: string
  nroProveido: string
  nroExpediente: string
  fecha: string
  areaDestino: string
  responsable: string
  instruccion: string
  estado: string
}

type Props = {
  proveidos: Proveido[]
  onNuevoProveido: () => void
}

export default function ProveidosView({
  proveidos,
  onNuevoProveido
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')

  const resultados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    return proveidos.filter(proveido => {
      const coincideTexto =
        !texto ||
        proveido.nroProveido.toLowerCase().includes(texto) ||
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
    <section className="view-section">

      <div className="page-header">

        <div>
          <h1>Proveídos</h1>

          <p>
            Consulta y gestión de los proveídos vinculados a los expedientes.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onNuevoProveido}
        >
          + Nuevo Proveído
        </button>

      </div>

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

      </div>

      <div className="table-container">

        <table className="data-table">

          <thead>
            <tr>
              <th>N.º Proveído</th>
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
                    {proveido.nroProveido || '—'}
                  </strong>
                </td>

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
                <td colSpan={7}>

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

      <div className="results-summary">

        Mostrando {resultados.length} de {proveidos.length} proveído
        {proveidos.length === 1 ? '' : 's'}.

      </div>

    </section>
  )
}

