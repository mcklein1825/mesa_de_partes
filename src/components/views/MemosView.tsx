  import { useMemo, useState } from 'react'
  import { Expediente, Memo } from '../../types'
  import { AREAS_UNICAS, getSubareas } from '../../constants'
  import ExpedienteSelector from '../common/ExpedienteSelector'
  import MemoDocumentLink from '../common/MemoDocumentLink'

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
    memoAsunto,
    setMemoAsunto,
    secretariaActual,
    memoAreaDestino,
    setMemoAreaDestino,
    memoResponsable,
    onSaveMemo,
    onCancelMemo,
    onSelectExpediente,
    onCloseMemoSelector,
    onUpdateMemoEstado,
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
    memoAsunto: string
    setMemoAsunto: (value: string) => void
    secretariaActual: string
    memoAreaDestino: string
    setMemoAreaDestino: (value: string) => void
    memoResponsable: string
    onSaveMemo: (archivo: File | null) => void
    onCancelMemo: () => void
    onSelectExpediente: (expediente: Expediente | null) => void
    onCloseMemoSelector: () => void
    onUpdateMemoEstado: (
    memoId: string,
    nuevoEstado: Memo['estado']
  ) => void
  }) {
    const [query, setQuery] = useState('')
    const [memoArchivo, setMemoArchivo] = useState<File | null>(null)
    const [memoArchivoNombre, setMemoArchivoNombre] = useState('')
    const [areaFilter, setAreaFilter] = useState('Todas')

    const [destinoBusqueda, setDestinoBusqueda] = useState('')
    const [destinoAbierto, setDestinoAbierto] = useState(false)
    const [estadoFilter, setEstadoFilter] = useState('Todos')
    const [page, setPage] = useState(1)
    const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null)
    const pageSize = 20
      /*
    * =========================================================
    * OPCIONES DE FILTROS
    * =========================================================
    */

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
    const destinoOptions = useMemo(() => {
  const opciones: {
    value: string
    label: string
    searchText: string
    esSubarea: boolean
  }[] = []

  AREAS_UNICAS.forEach(area => {
    opciones.push({
      value: area,
      label: area,
      searchText: area,
      esSubarea: false
    })

    getSubareas(area).forEach(subarea => {
      opciones.push({
        value: `${area} / ${subarea}`,
        label: `${area} → ${subarea}`,
        searchText: `${area} ${subarea}`,
        esSubarea: true
      })
    })
  })

  return opciones
}, [])
    const destinosFiltrados = useMemo(() => {
  const termino = destinoBusqueda.trim().toLowerCase()

  if (!termino) {
    return destinoOptions
  }

  return destinoOptions.filter(opcion =>
    opcion.searchText
      .toLowerCase()
      .includes(termino)
  )
}, [destinoBusqueda, destinoOptions])
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
  const termino = query.trim().toLowerCase()

  return memos.filter(memo => {
    let coincideBusqueda = true

    if (termino) {
      const nroMemo = String(memo.nroMemo || '')
        .trim()
        .toLowerCase()

      const nroExpediente = String(memo.nroExpediente || '')
        .trim()
        .toLowerCase()

      const nroExpedienteFormateado =
        nroExpediente.startsWith('exp-')
          ? nroExpediente
          : `exp-2026-${nroExpediente.padStart(5, '0')}`

      const registradoPor = String(memo.registradoPor || '')
        .trim()
        .toLowerCase()

      const asunto = String(memo.asunto || '')
        .trim()
        .toLowerCase()

      const areaDestino = String(memo.areaDestino || '')
        .trim()
        .toLowerCase()

      const responsable = String(memo.responsable || '')
        .trim()
        .toLowerCase()

      const terminoEsNumero = /^\d+$/.test(termino)

      if (terminoEsNumero) {
        coincideBusqueda =
          nroMemo === termino ||
          nroExpediente === termino ||
          nroExpedienteFormateado ===
            `exp-2026-${termino.padStart(5, '0')}` ||
          nroExpedienteFormateado.endsWith(
            `-${termino.padStart(5, '0')}`
          )
      } else {
        coincideBusqueda =
          nroMemo.includes(termino) ||
          nroExpedienteFormateado.includes(termino) ||
          asunto.includes(termino) ||
          registradoPor.includes(termino) ||
          areaDestino.includes(termino) ||
          responsable.includes(termino)
      }
    }

    const coincideArea =
      areaFilter === 'Todas' ||
      memo.areaDestino === areaFilter

    const coincideEstado =
      estadoFilter === 'Todos' ||
      memo.estado === estadoFilter

    return (
      coincideBusqueda &&
      coincideArea &&
      coincideEstado
    )
  })
}, [
  memos,
  query,
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
    
    /*
    * =========================================================
    * FORMULARIO DE NUEVO MEMO
    * =========================================================
    */

if (showMemoForm && expediente) {
  return (
    <div className="memo-form-page">

      <div className="memo-form-header">

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

      <div className="memo-form-card">

        <div className="memo-form-section-header">

          <div>
            <h2>Expediente relacionado</h2>

            <p>
              El Memo quedará vinculado a este expediente.
            </p>
          </div>

        </div>

        <div className="memo-expediente-info">

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

      <div className="memo-form-card">

        <div className="memo-form-section-header">

          <div>
            <h2>Datos del Memo</h2>

            <p>
              Complete la información necesaria para registrar el Memo.
            </p>
          </div>

        </div>

        <div className="memo-form-grid">

          <div className="memo-form-field">
            <label>N.º Memo</label>

            <input
              type="text"
              value={memoNro}
              readOnly
              placeholder="Se asignará automáticamente"
            />
          </div>

          <div className="memo-form-field">
            <label>Fecha</label>

            <input
              type="date"
              value={memoFecha}
              onChange={e =>
                setMemoFecha(e.target.value)
              }
            />
          </div>

          <div className="memo-form-field">
            <label>Registrado por</label>

            <input
              type="text"
              value={secretariaActual}
              readOnly
              placeholder="Usuario"
            />
          </div>

         <div className="memo-form-field memo-destino-field">
  <label>Destino</label>

  <div className="memo-destino-combobox">

    <input
      type="text"
      value={destinoBusqueda}
      onChange={e => {
        setDestinoBusqueda(e.target.value)
        setDestinoAbierto(true)

        if (memoAreaDestino) {
          setMemoAreaDestino('')
        }
      }}
      onFocus={() => {
        setDestinoAbierto(true)
      }}
      placeholder="Escribe área o subárea..."
      autoComplete="off"
    />

    {destinoAbierto && (
      <div className="memo-destino-options">

        {destinosFiltrados.length > 0 ? (
          destinosFiltrados.map(opcion => (
            <button
              key={opcion.value}
              type="button"
              className={
                opcion.esSubarea
                  ? 'memo-destino-option memo-destino-subarea'
                  : 'memo-destino-option'
              }
              onMouseDown={event => {
                event.preventDefault()

                setMemoAreaDestino(
                  opcion.value
                )

                setDestinoBusqueda(
                  opcion.label
                )

                setDestinoAbierto(false)
              }}
            >
              {opcion.label}
            </button>
          ))
        ) : (
          <div className="memo-destino-empty">
            No se encontraron áreas o subáreas.
          </div>
        )}

      </div>
    )}

  </div>

  {memoAreaDestino && (
    <small>
      Destino seleccionado: {memoAreaDestino}
    </small>
  )}
</div>

          <div className="memo-form-field">
            <label>Responsable</label>

            <input
              type="text"
              value={memoResponsable}
              readOnly
              placeholder="Se completará automáticamente"
            />
          </div>

          <div className="memo-form-field">
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

          <div className="memo-form-field memo-file-field">
            <label>Archivo del Memo</label>

            <label className="memo-file-button">
              ▣ Seleccionar archivo

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={event => {
                  const file = event.target.files?.[0] || null

                  if (!file) {
                    setMemoArchivo(null)
                    setMemoArchivoNombre('')
                    return
                  }

                  if (file.size > 5 * 1024 * 1024) {
                    alert('El archivo no puede superar los 5 MB.')
                    event.target.value = ''
                    setMemoArchivo(null)
                    setMemoArchivoNombre('')
                    return
                  }

                  setMemoArchivo(file)
                  setMemoArchivoNombre(file.name)
                }}
              />
            </label>

            <small>
              {memoArchivoNombre
                ? `Seleccionado: ${memoArchivoNombre}`
                : 'Máximo 5 MB.'}
            </small>
          </div>

          <div className="memo-form-actions">

            <button
              className="primary-button"
              onClick={() => onSaveMemo(memoArchivo)}
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

    {showMemoSelector && !expediente && (
      <div
        className="memo-modal-overlay"
        onMouseDown={event => {
          if (event.target === event.currentTarget) {
            onCloseMemoSelector()
          }
        }}
      >

        <div
          className="memo-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nuevo-memo-title"
        >

          <div className="memo-modal-header">

            <div>
              <p className="eyebrow">
                GESTIÓN DOCUMENTAL
              </p>

              <h2 id="nuevo-memo-title">
                Nuevo Memo
              </h2>

              <p>
                Seleccione el expediente al que desea asociar el Memo.
              </p>
            </div>

            <button
              type="button"
              className="memo-modal-close"
              onClick={onCloseMemoSelector}
              aria-label="Cerrar"
            >
              ×
            </button>

          </div>

          <div className="memo-modal-body">

            <div className="section-header">

              <div>
                <h3>
                  Seleccionar expediente
                </h3>

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

          <div className="memo-modal-footer">

            <button
              type="button"
              className="legacy-light-button"
              onClick={onCloseMemoSelector}
            >
              Cancelar
            </button>

          </div>

        </div>

      </div>
    )}

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
                placeholder="Buscar por N.º Memo, expediente o documento..."
              />

            </div>


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

            <table className="memos-table">

             <thead>
              <tr>
                <th>N.º MEMO</th>
                <th>N.º EXPEDIENTE</th>
                <th>FECHA</th>
                <th>ASUNTO</th>
                <th className="memo-estado-columna">ESTADO</th>
                <th>MÁS DATOS</th>
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
          <MemoDocumentLink
            archivoData={memo.archivoData}
            archivo={memo.archivo}
          >
            {memo.asunto || '—'}
          </MemoDocumentLink>
       </td>

      {/* ESTADO */}
      <td className="memo-estado-columna">
        <select
          className="status-badge"
          value={memo.estado}
          onChange={e => {
            const nuevoEstado =
              e.target.value as Memo['estado']

            console.log('CAMBIANDO MEMO:', {
              id: memo.id,
              nroMemo: memo.nroMemo,
              estadoAnterior: memo.estado,
              nuevoEstado
            })

            onUpdateMemoEstado(
              memo.id,
              nuevoEstado
            )
          }}
        >
          {memo.estado === 'Pendiente' && (
            <>
              <option value="Pendiente">
                Pendiente
              </option>

              <option value="Sin respuesta">
                Sin respuesta
              </option>

              <option value="Atendido">
                Atendido
              </option>
            </>
          )}

          {memo.estado === 'Sin respuesta' && (
            <>
              <option value="Sin respuesta">
                Sin respuesta
              </option>

              <option value="Atendido">
                Atendido
              </option>

              <option value="Archivado">
                Archivado
              </option>
            </>
          )}

          {memo.estado === 'Atendido' && (
            <option value="Atendido">
              Atendido
            </option>
          )}

          {memo.estado === 'Archivado' && (
            <option value="Archivado">
              Archivado
            </option>
          )}
        </select>
      </td>

      {/* MÁS DATOS */}
      <td className="actions-cell">
        <button
          className="tracking-button"
          onClick={() => {
            console.log('MEMO SELECCIONADO:', memo)
            setSelectedMemo(memo)
          }}
        >
          ◉ Ver más datos
        </button>
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

        {selectedMemo && (
          <div className="modal-overlay">
            <div className="modal-card">

              <div className="section-header">

                <div>
                  <p className="eyebrow">
                    GESTIÓN DOCUMENTAL
                  </p>

                  <h2>
                    Datos del Memo {selectedMemo.nroMemo}
                  </h2>
                </div>

                <button
                  className="action-link"
                  onClick={() => setSelectedMemo(null)}
                >
                  ✕
                </button>

              </div>

              <div className="detail-grid">

                <div>
                  <strong>N.º Memo</strong>
                  <p>
                    {selectedMemo.nroMemo || '—'}
                  </p>
                </div>

                <div>
                  <strong>N.º Expediente</strong>
                  <p>
                    {selectedMemo.nroExpediente || '—'}
                  </p>
                </div>

                <div>
                  <strong>Fecha</strong>
                  <p>
                    {selectedMemo.fecha || '—'}
                  </p>
                </div>

                <div>
                  <strong>Registrado por</strong>
                  <p>
                    {selectedMemo.registradoPor || '—'}
                  </p>
                </div>

                <div>
                  <strong>Área destino</strong>
                  <p>
                    {selectedMemo.areaDestino || '—'}
                  </p>
                </div>

                <div>
                  <strong>Responsable</strong>
                  <p>
                    {selectedMemo.responsable || '—'}
                  </p>
                </div>

                <div>
                  <strong>Estado</strong>
                  <p>
                    {selectedMemo.estado || '—'}
                  </p>
                </div>

                <div>
                  <strong>Archivo</strong>

                  <p>
                    {selectedMemo.archivo || 'Sin archivo'}
                  </p>

                  {selectedMemo.archivoData && (
                    <button
                      className="tracking-button"
                      onClick={() => {
                        window.open(
                          selectedMemo.archivoData,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }}
                    >
                      ◉ Abrir archivo
                    </button>
                  )}
                </div>

              </div>

              <div style={{ marginTop: '20px' }}>

                <strong>Asunto</strong>

                <p>
                  {selectedMemo.asunto || 'Sin asunto'}
                </p>

              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '24px'
                }}
              >
                <button
                  className="action-link"
                  onClick={() => setSelectedMemo(null)}
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    )
  }

