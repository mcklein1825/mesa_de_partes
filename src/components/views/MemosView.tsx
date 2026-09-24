import { useMemo, useState } from 'react'
import { Expediente, Memo } from '../../types'
import ExpedienteSelector from '../common/ExpedienteSelector'
import { obtenerResponsablePorArea } from '../../utils/areasResponsables'

export default function MemosView({
  expediente,
  expedientes,
  areaOptions,
  memos,
  onNewMemo,
  showMemoForm,
  showMemoSelector,
  memoNro,
  setMemoNro,
  memoFecha,
  setMemoFecha,
  memoDestinatario,
  setMemoDestinatario,
  memoAsunto,
  setMemoAsunto,
  memoSecretaria,
  setMemoSecretaria,
  memoAreaDestino,
  setMemoAreaDestino,
  memoInstruccion,
  setMemoInstruccion,
  memoPlazo,
  setMemoPlazo,
  onSaveMemo,
  onCancelMemo,
  onSelectExpediente,
  onCloseMemoSelector,
  onUpdateMemoEstado,
  onSimularArchivadoMemo
}: {
  expediente: Expediente | null
  expedientes: Expediente[]
  areaOptions: string[]
  memos: Memo[]
  onBack: () => void
  onNewMemo: () => void
  showMemoForm: boolean
  showMemoSelector: boolean
  memoNro: string
  setMemoNro: (value: string) => void
  memoFecha: string
  setMemoFecha: (value: string) => void
  memoDestinatario: string
  setMemoDestinatario: (value: string) => void
  memoAsunto: string
  setMemoAsunto: (value: string) => void
  memoSecretaria: string
  setMemoSecretaria: (value: string) => void
  memoAreaDestino: string
  setMemoAreaDestino: (value: string) => void
  memoInstruccion: string
  setMemoInstruccion: (value: string) => void
  memoPlazo: string
  setMemoPlazo: (value: string) => void
  onSaveMemo: () => void
  onCancelMemo: () => void
  onSelectExpediente: (expediente: Expediente | null) => void
  onCloseMemoSelector: () => void
  onUpdateMemoEstado: (
  memoId: string,
  nuevoEstado: Memo['estado']
) => void
  onSimularArchivadoMemo: (
  memoId: string
) => void
}) {
  const [query, setQuery] = useState('')
  const [secretariaFilter, setSecretariaFilter] = useState('Todas')
  const [areaFilter, setAreaFilter] = useState('Todas')
  const [estadoFilter, setEstadoFilter] = useState('Todos')
  const [page, setPage] = useState(1)
  const [showResponsableWarning, setShowResponsableWarning] = useState(false)

  const pageSize = 20
  const responsableMemo = obtenerResponsablePorArea(memoAreaDestino)
  /*
   * =========================================================
   * OPCIONES DE FILTROS
   * =========================================================
   */

  const secretariaOptions = useMemo(() => {
    return Array.from(
      new Set(
        memos
          .map(memo => memo.secretaria)
          .filter(Boolean)
      )
    ).sort()
  }, [memos])

  const memoAreaOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...areaOptions,
        ...memos
          .map(memo => memo.areaDestino)
          .filter(Boolean)
      ])
    ).sort()
  }, [areaOptions, memos])

  const estadoOptions = useMemo(() => {
    return Array.from(
      new Set(
        memos
          .map(memo => memo.estado)
          .filter(Boolean)
      )
    ).sort()
  }, [memos])
  const expedientesConMemo = useMemo(() => {
  return memos.map(memo => String(memo.expedienteId))
}, [memos])

  /*
   * =========================================================
   * FILTROS
   * =========================================================
   */

  const memosFiltrados = useMemo(() => {
    const texto = query.trim().toLowerCase()

    return memos.filter(memo => {
      const coincideBusqueda =
        !texto ||
        memo.nroMemo.toLowerCase().includes(texto) ||
        memo.nroExpediente.toLowerCase().includes(texto) ||
        memo.destinatario.toLowerCase().includes(texto) ||
        memo.asunto.toLowerCase().includes(texto)

      const coincideSecretaria =
        secretariaFilter === 'Todas' ||
        memo.secretaria === secretariaFilter

      const coincideArea =
        areaFilter === 'Todas' ||
        memo.areaDestino === areaFilter

      const coincideEstado =
        estadoFilter === 'Todos' ||
        memo.estado === estadoFilter

      return (
        coincideBusqueda &&
        coincideSecretaria &&
        coincideArea &&
        coincideEstado
      )
    })
  }, [
    memos,
    query,
    secretariaFilter,
    areaFilter,
    estadoFilter
  ])

  /*
   * =========================================================
   * PAGINACIÓN
   * =========================================================
   */

  const pageCount = Math.max(
    1,
    Math.ceil(memosFiltrados.length / pageSize)
  )

  const currentPage = Math.min(page, pageCount)

  const pageItems = memosFiltrados.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  /*
   * =========================================================
   * FORMATO DE EXPEDIENTE
   * =========================================================
   */

  const formatExpediente = (nroExp: string) => {
    if (nroExp.startsWith('EXP-')) {
      return nroExp
    }

    return `EXP-2026-${nroExp.padStart(5, '0')}`
  }

  /*
   * =========================================================
   * NUEVO MEMO
   *
   * Esta vista SOLO aparece cuando se pulsa:
   * + Nuevo Memo
   *
   * No se muestra al entrar normalmente a Memos.
   * =========================================================
   */

  if (showMemoSelector && !expediente) {
    return (
      <div className="page">

        <div className="page-header">

          <div>
            <p className="eyebrow">
              GESTIÓN DOCUMENTAL
            </p>

            <h1>Nuevo Memo</h1>

            <p className="muted">
              Seleccione el expediente al que desea asociar el Memo.
            </p>
          </div>

          <button
            className="action-link"
            onClick={onCloseMemoSelector}
          >
            ← Volver
          </button>

        </div>

        <div className="detail-card">

          <div className="section-header">

            <div>
              <h2>Seleccionar expediente</h2>

              <p>
                Busque el expediente por número, asunto,
                remitente o área.
              </p>
            </div>

          </div>

          <ExpedienteSelector
            expedientes={expedientes}
            value={null}
            onChange={selectedExpediente => {
              if (!selectedExpediente) {
                return
              }

              onSelectExpediente(selectedExpediente)
            }}
            areaOptions={areaOptions}
            expedientesExcluidos={expedientesConMemo}
          />

        </div>

      </div>
    )
  }

  /*
   * =========================================================
   * FORMULARIO DE NUEVO MEMO
   * =========================================================
   */

  if (showMemoForm && expediente) {
    return (
      <div className="page">

        <div className="page-header">

          <div>
            <p className="eyebrow">
              GESTIÓN DOCUMENTAL
            </p>

            <h1>Nuevo Memo</h1>

            <p className="muted">
              Registrar un nuevo Memo relacionado con un expediente.
            </p>
          </div>

          <button
            className="action-link"
            onClick={onCancelMemo}
          >
            ← Cancelar
          </button>

        </div>

        <div className="detail-card">

          <div className="section-header">

            <div>
              <h2>Expediente relacionado</h2>

              <p>
                El Memo quedará vinculado a este expediente.
              </p>
            </div>

          </div>

          <div className="detail-grid">

            <div>
              <strong>Expediente</strong>

              <p>
                {formatExpediente(expediente.nroExp)}
              </p>
            </div>

            <div>
              <strong>Remitente</strong>

              <p>
                {expediente.remitente || 'Sin especificar'}
              </p>
            </div>

            <div>
              <strong>Asunto del expediente</strong>

              <p>
                {expediente.asunto || 'Sin asunto'}
              </p>
            </div>

          </div>

        </div>

        <div className="detail-card">

          <div className="section-header">

            <div>
              <h2>Datos del Memo</h2>

              <p>
                Complete la información necesaria para registrar el Memo.
              </p>
            </div>

          </div>

          <div className="detail-grid">

            <div>
              <label>N.º Memo</label>

              <input
                type="text"
                value={memoNro}
                readOnly
                placeholder="Se asignará automáticamente"
              />
            </div>

            <div>
              <label>Fecha</label>

              <input
                type="date"
                value={memoFecha}
                onChange={e =>
                  setMemoFecha(e.target.value)
                }
              />
            </div>

            <div>
              <label>Destinatario</label>

              <input
                type="text"
                value={memoDestinatario}
                onChange={e =>
                  setMemoDestinatario(e.target.value)
                }
                placeholder="Nombre del destinatario"
              />
            </div>

            <div>
              <label>Secretaría</label>

              <input
                type="text"
                value={memoSecretaria}
                onChange={e =>
                  setMemoSecretaria(e.target.value)
                }
                placeholder="Secretaría"
              />
            </div>

            <div>
              <label>Área destino</label>

              <select
                value={memoAreaDestino}
                onChange={e =>
                  setMemoAreaDestino(e.target.value)
                }
              >
                <option value="">
                  Seleccione un área
                </option>

                {areaOptions.map(area => (
                  <option
                    key={area}
                    value={area}
                  >
                    {area}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Responsable</label>

              <input
                type="text"
                value={responsableMemo?.responsable || ''}
                readOnly
                placeholder="Se asignará según el área"
              />
            </div>

            <div>
              <label>Cargo</label>

              <input
                type="text"
                value={responsableMemo?.cargo || ''}
                readOnly
                placeholder="Se asignará según el área"
              />
            </div>

           <div>
            <label>Asunto</label>

            <input
              type="text"
              value={memoAsunto}
              onChange={e =>
                setMemoAsunto(e.target.value)
              }
              placeholder="Asunto del Memo"
            />
            </div>

            <div>
              <label>Plazo</label>

              <input
                type="text"
                value={memoPlazo}
                onChange={e =>
                  setMemoPlazo(e.target.value)
                }
                placeholder="Ej. 5 días hábiles"
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px'
              }}
            >
              <button
                className="primary-button"
                onClick={() => {
                  if (!responsableMemo?.responsable?.trim()) {
                    setShowResponsableWarning(true)
                    return
                  }

                  onSaveMemo()
                }}
              >
                Guardar Memo
              </button>

              <button
                className="action-link"
                onClick={onCancelMemo}
              >
                Cancelar
              </button>
            </div>
          
                 </div>

        </div>

        {showResponsableWarning && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '28px',
                width: 'min(420px, 90%)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
                textAlign: 'center'
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                Advertencia
              </h2>

              <p style={{ marginBottom: '24px' }}>
                El área seleccionada no tiene un responsable configurado.
                ¿Desea continuar y registrar el Memo de todas formas?
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '10px'
                }}
              >
                <button
                  className="action-link"
                  onClick={() => setShowResponsableWarning(false)}
                >
                  Cancelar
                </button>

                <button
                  className="primary-button"
                  onClick={() => {
                    setShowResponsableWarning(false)
                    onSaveMemo()
                  }}
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  /*
   * =========================================================
   * DASHBOARD PRINCIPAL
   *
   * ESTA ES LA VISTA NORMAL DE "MEMOS".
   *
   * Aquí aparecen TODOS los Memos registrados.
   * No depende de seleccionar expediente.
   * No depende de elegir tipo de documento.
   * =========================================================
   */

  return (
    <div className="page">

      <div className="page-heading compact">

        <div>
          <p className="eyebrow">
            GESTIÓN DOCUMENTAL
          </p>

          <h1>Memos</h1>

          <p className="muted">
            Consulta, filtra y gestiona los Memos registrados.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onNewMemo}
        >
          ＋ Nuevo Memo
        </button>

      </div>

      <section className="panel list-panel">

        <div className="toolbar">

          <div className="search-box">

            <span>⌕</span>

            <input
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Buscar por N.º Memo, expediente, destinatario o asunto..."
            />

          </div>

          <select
            value={secretariaFilter}
            onChange={e => {
              setSecretariaFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="Todas">
              Todas las secretarías
            </option>

            {secretariaOptions.map(secretaria => (
              <option
                key={secretaria}
                value={secretaria}
              >
                {secretaria}
              </option>
            ))}

          </select>

          <select
            value={areaFilter}
            onChange={e => {
              setAreaFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="Todas">
              Todas las áreas
            </option>

            {memoAreaOptions.map(area => (
              <option
                key={area}
                value={area}
              >
                {area}
              </option>
            ))}

          </select>

          <select
            value={estadoFilter}
            onChange={e => {
              setEstadoFilter(e.target.value)
              setPage(1)
            }}
          >
            <option value="Todos">
              Todos los estados
            </option>

            {estadoOptions.map(estado => (
              <option
                key={estado}
                value={estado}
              >
                {estado}
              </option>
            ))}

          </select>

          <span className="result-count">
            {memosFiltrados.length} resultados
          </span>

        </div>

        <div className="table-wrap">

          <table>

            <thead>
              <tr>
                <th>N.º MEMO</th>
                <th>N.º EXPEDIENTE</th>
                <th>FECHA</th>
                <th>DESTINATARIO</th>
                <th>ASUNTO</th>
                <th>SECRETARÍA</th>
                <th>ÁREA DESTINO</th>
                <th>RESPONSABLE</th>
                <th>CARGO</th>
                <th>PLAZO</th>
                <th>RECEPCIONADO POR</th>
                <th>FECHA RECEPCIÓN</th>
                <th className="memo-estado-columna">ESTADO</th>
              </tr>
            </thead>

            <tbody>

              {pageItems.map(memo => (
                <tr key={memo.id}>

                  <td>
                    <b className="exp-id">
                      {memo.nroMemo}
                    </b>
                  </td>

                  <td>
                    <b>
                      {memo.nroExpediente}
                    </b>
                  </td>

                  <td>
                    {memo.fecha || '—'}
                  </td>

                  <td>
                    <span
                      className="table-cell-text"
                      title={memo.destinatario}
                    >
                      {memo.destinatario || '—'}
                    </span>
                  </td>

                  <td>
                    <span
                      className="table-cell-text"
                      title={memo.asunto}
                    >
                      {memo.asunto || '—'}
                    </span>
                  </td>

                  <td>
                    <span
                      className="table-cell-text"
                      title={memo.secretaria}
                    >
                      {memo.secretaria || '—'}
                    </span>
                  </td>

                 <td>
                  <span
                    className="table-cell-text"
                    title={memo.areaDestino}
                  >
                    {memo.areaDestino || '—'}
                  </span>
                </td>

                <td>
                  <span
                    className="table-cell-text"
                    title={memo.responsable || ''}
                  >
                    {memo.responsable || '—'}
                  </span>
                </td>

                <td>
                  <span
                    className="table-cell-text"
                    title={memo.cargo || ''}
                  >
                    {memo.cargo || '—'}
                  </span>
                </td>

                <td>
                  {memo.plazo || '—'}
                </td>

                <td>
                  {memo.recepcionadoPor || '—'}
                </td>

                  <td>
                    {memo.fechaRecepcion || '—'}
                  </td>

                  <td className="memo-estado-columna">
                  <select
                    className="status-badge"
                    value={memo.estado}
                    onChange={e => {
                      const nuevoEstado = e.target.value as Memo['estado']

                      console.log('CAMBIANDO MEMO:', {
                        id: memo.id,
                        nroMemo: memo.nroMemo,
                        estadoAnterior: memo.estado,
                        nuevoEstado
                      })

                      onUpdateMemoEstado(memo.id, nuevoEstado)
                    }}
                  >
                    {memo.estado === 'Pendiente' && (
                      <>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Sin respuesta">Sin respuesta</option>
                        <option value="Atendido">Atendido</option>
                      </>
                    )}

                    {memo.estado === 'Sin respuesta' && (
                      <>
                        <option value="Sin respuesta">Sin respuesta</option>
                        <option value="Atendido">Atendido</option>
                        <option value="Archivado">Archivado</option>
                      </>
                    )}

                    {memo.estado === 'Atendido' && (
                      <option value="Atendido">Atendido</option>
                    )}

                    {memo.estado === 'Archivado' && (
                      <option value="Archivado">Archivado</option>
                    )}
                                    </select>

                  {memo.estado === 'Sin respuesta' && (
                    <button
                      type="button"
                      onClick={() => onSimularArchivadoMemo(memo.id)}
                      style={{
                        marginLeft: '8px',
                        padding: '4px 8px',
                        fontSize: '11px'
                      }}
                    >
                       Probar 30 días
                    </button>
                  )}

                  </td>

                </tr>
              ))}

            </tbody>

          </table>

          {memosFiltrados.length === 0 && (
            <div className="empty-state">
              No se encontraron Memos con esos criterios.
            </div>
          )}

        </div>

        <div className="pagination">

          Mostrando{' '}

          <b>
            {memosFiltrados.length
              ? (currentPage - 1) * pageSize + 1
              : 0}
            -
            {Math.min(
              currentPage * pageSize,
              memosFiltrados.length
            )}
          </b>{' '}

          de{' '}

          <b>
            {memosFiltrados.length}
          </b>{' '}
          Memos

          <button
            disabled={currentPage === 1}
            onClick={() =>
              setPage(currentPage - 1)
            }
          >
            ‹
          </button>

          <b className="current-page">
            {currentPage}
          </b>

          <button
            disabled={currentPage === pageCount}
            onClick={() =>
              setPage(currentPage + 1)
            }
          >
            ›
          </button>

        </div>

      </section>

    </div>
  )
}

