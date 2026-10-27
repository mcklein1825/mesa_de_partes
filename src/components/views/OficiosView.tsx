import { useMemo, useState } from 'react'
import { Expediente, Oficio } from '../../types'
import { formatNroExp, displayDate } from '../../utils/expedienteHelpers'

type Props = {
  oficios: Oficio[]
  oficioExpediente: Expediente | null
  areaOptions: string[] // <-- NUEVA PROP
  onNuevoOficio: () => void
}

export default function OficiosView({
  oficios,
  oficioExpediente,
  areaOptions, // <-- NUEVA PROP
  onNuevoOficio
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')
  const [areaFilter, setAreaFilter] = useState('Todas') // <-- NUEVO ESTADO

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

      // NUEVO FILTRO DE ÁREA
      const coincideArea =
        areaFilter === 'Todas' ||
        oficio.areaDestino === areaFilter

      return coincideTexto && coincideEstado && coincideArea
    })
  }, [oficios, busqueda, estadoFiltro, areaFilter]) // <-- Agregamos areaFilter a las dependencias

  return (
    <>
      <div className="page-heading compact">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Oficios</h1>
          <p className="muted">
            Consulta y gestión de los oficios vinculados a los expedientes.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={onNuevoOficio}
        >
          ＋ Nuevo Oficio
        </button>
      </div>

      <section className="panel list-panel">
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

        {/* NUEVO SELECTOR DE ÁREAS */}
        <select
          value={areaFilter}
          onChange={e => setAreaFilter(e.target.value)}
        >
          <option value="Todas">Todas las áreas</option>
          {areaOptions.map(area => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        <table className="data-table oficios-table">
          <thead>
            <tr>
              <th>N.° REGISTRO</th>
              <th>EXPEDIENTE</th>
              <th>FECHA</th>
              <th>DESTINATARIO</th>
              <th>ÁREA DESTINO</th>
              <th>ASUNTO</th>
              <th>RESPONSABLE</th>
              <th>ESTADO</th>
            </tr>
          </thead>

          <tbody>
            {resultados.map(oficio => (
              <tr key={oficio.id}>
                <td>
                  <b className="exp-id">{oficio.nRegistro}</b>
                </td>

                <td>
                  <b className="exp-id">
                    {oficio.nroExpediente
                      ? formatNroExp(oficio.nroExpediente)
                      : 'Sin expediente'}
                  </b>
                </td>

                <td>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {oficio.fecha ? displayDate(oficio.fecha) : '-'}
                  </span>
                </td>

                <td>
                  <span
                    title={oficio.destinatario || '-'}
                    style={{
                      display: 'block',
                      maxWidth: '150px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {oficio.destinatario || '-'}
                  </span>
                </td>

                <td>
                  <span
                    title={oficio.areaDestino || '-'}
                    style={{
                      display: 'block',
                      maxWidth: '150px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {oficio.areaDestino || '-'}
                  </span>
                </td>

                <td>
                  <div
                    title={[oficio.asuntoTipo, oficio.asuntoDetalle].filter(Boolean).join(' - ')}
                    style={{
                      maxWidth: '250px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {oficio.asuntoTipo && (
                      <strong>{oficio.asuntoTipo} </strong>
                    )}
                    {oficio.asuntoDetalle || (!oficio.asuntoTipo ? '-' : '')}
                  </div>
                </td>

                <td>
                  <span
                    title={oficio.responsable || '-'}
                    style={{
                      display: 'block',
                      maxWidth: '150px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {oficio.responsable || '-'}
                  </span>
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

        <div className="pagination">
          Mostrando {resultados.length} de {oficios.length} oficio
          {oficios.length === 1 ? '' : 's'}.
        </div>
      </section>
    </>
  )
}