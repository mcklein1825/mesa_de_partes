  import { useEffect, useMemo, useState } from 'react'
  import { Expediente, Memo } from '../../types'
  import { getAreaCopia, getSubareas } from '../../constants'
  import ExpedienteSelector from '../common/ExpedienteSelector'
  import MemoDocumentLink from '../common/MemoDocumentLink'
  import MemoDetailsModal from '../modals/MemoDetailsModal'
  import { displayDate } from '../../utils/expedienteHelpers'
  import { formatDocumentNumber } from '../../utils/documentHelpers'
  import useMemosList from '../../features/mesaPartes/useMemosList'
  import { getSupportedDocumentMimeType } from '../../utils/expedienteHelpers'
  import { useToast } from '../common/ToastProvider'
  import Modal from '../common/Modal'
  import { Copy, Paperclip, Search } from 'lucide-react'

  export default function MemosView({
    expediente,
    expedientes,
    areaOptions,
    memos,
    canCreate,
    canAtender,
    canArchivar,
    memoParaDuplicar,
    onNewMemo,
    onDuplicateMemo,
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
    canCreate: boolean
    canAtender: boolean
    canArchivar: boolean
    memoParaDuplicar: Memo | null
    onBack: () => void
    onNewMemo: () => void
    onDuplicateMemo: (memo: Memo) => void
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
    const { toast } = useToast()
    const [memoArchivo, setMemoArchivo] = useState<File | null>(null)
    const [memoArchivoNombre, setMemoArchivoNombre] = useState('')
    const [showDuplicateMemoModal, setShowDuplicateMemoModal] = useState(false)
    const [memoDuplicadoBusqueda, setMemoDuplicadoBusqueda] = useState('')
    const [memoSeleccionadoParaDuplicar, setMemoSeleccionadoParaDuplicar] =
      useState<Memo | null>(null)
    const {
      query,
      setQuery,
      areaFilter,
      setAreaFilter,
      estadoFilter,
      setEstadoFilter,
      page,
      setPage,
      selectedMemo,
      setSelectedMemo,
      documentosExpedientes,
      memoAreaOptions,
      destinoOptions,
      estadoOptions,
      expedientesConMemo,
      memosFiltrados,
      pageItems,
      pageSize,
      pageCount,
      currentPage,
      formatExpediente
    } = useMemosList(memos, expedientes, areaOptions)
    const [destinoBusqueda, setDestinoBusqueda] = useState('')
    const [destinoAbierto, setDestinoAbierto] = useState(false)
    const [memoSubareaDestino, setMemoSubareaDestino] = useState('')
    const [memoAreaPrincipalDestino, setMemoAreaPrincipalDestino] = useState('')

    useEffect(() => {
      if (!showMemoForm) {
        setMemoArchivo(null)
        setMemoArchivoNombre('')
        return
      }

      if (!memoParaDuplicar) {
        return
      }

      const [areaPrincipal, subarea = ''] = memoParaDuplicar.areaDestino
        .split(' / ')
      setMemoAreaPrincipalDestino(areaPrincipal)
      setMemoSubareaDestino(subarea)
      setDestinoBusqueda(areaPrincipal)
    }, [showMemoForm, memoParaDuplicar])
      /*
    * =========================================================
    * OPCIONES DE FILTROS
    * =========================================================
    */
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

    const memosParaDuplicar = useMemo(() => {
      const termino = memoDuplicadoBusqueda.trim().toLowerCase()

      if (!termino) {
        return memos
      }

      return memos.filter(memo =>
        [
          formatDocumentNumber(memo.nroMemo, memo.createdAt),
          memo.nroExpediente,
          memo.asunto,
          memo.areaDestino,
          memo.realizadoPor,
          memo.responsable,
          getAreaCopia(memo.areaDestino)
        ].some(valor => String(valor || '').toLowerCase().includes(termino))
      )
    }, [memos, memoDuplicadoBusqueda])
    /*
    * =========================================================
    * FILTROS
    * =========================================================
    */

    /*
    * =========================================================
    * PAGINACIÓN
    * =========================================================
    */

    /*
    * =========================================================
    * FORMATO DE EXPEDIENTE
    * =========================================================
    */

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
            {memoParaDuplicar
              ? `Copia de ${formatDocumentNumber(memoParaDuplicar.nroMemo, memoParaDuplicar.createdAt)}. El original se conservará y debe elegir otro expediente.`
              : 'Registrar un nuevo Memo relacionado con un expediente.'}
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
            <label>Realizado por</label>

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
              className="memo-destino-option"
              onMouseDown={event => {
                event.preventDefault()

                setMemoAreaPrincipalDestino(opcion.value)
                setMemoAreaDestino(opcion.value)
                setMemoSubareaDestino('')

                setDestinoBusqueda(opcion.label)
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
  <>
    <small>
      Área seleccionada: {memoAreaPrincipalDestino}
    </small>

    {getSubareas(memoAreaPrincipalDestino).length > 0 && (
      <div className="memo-form-field memo-subarea-field">
        <label>Subárea</label>

        <select
          value={memoSubareaDestino}
          onChange={e => {
            const subarea = e.target.value

            setMemoSubareaDestino(subarea)

            if (subarea) {
              setMemoAreaDestino(
                `${memoAreaPrincipalDestino} / ${subarea}`
              )
            } else {
              setMemoAreaDestino(
                memoAreaPrincipalDestino
              )
            }
          }}
        >
          <option value="">
            Seleccione una subárea
          </option>

          {getSubareas(
            memoAreaPrincipalDestino
          ).map(subarea => (
            <option
              key={subarea}
              value={subarea}
            >
              {subarea}
            </option>
          ))}
        </select>

        {memoSubareaDestino && (
          <small>
            Destino seleccionado:{' '}
            {memoAreaPrincipalDestino} /{' '}
            {memoSubareaDestino}
          </small>
        )}
      </div>
    )}
  </>
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
            {getAreaCopia(memoAreaDestino) && (
              <small>
                Con copia a: {getAreaCopia(memoAreaDestino)}
              </small>
            )}
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
              <><Paperclip size={16} aria-hidden="true" /> Seleccionar archivo</>

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

                  if (!getSupportedDocumentMimeType(file)) {
                    toast('Adjunte un archivo PDF, JPG, JPEG o PNG.', 'warning')
                    event.target.value = ''
                    setMemoArchivo(null)
                    setMemoArchivoNombre('')
                    return
                  }

                  if (file.size > 5 * 1024 * 1024) {
                    toast('El archivo no puede superar los 5 MB.', 'warning')
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
                : memoParaDuplicar?.archivoData
                  ? `Se conservará el archivo ${memoParaDuplicar.archivo || 'original'} si no selecciona otro. Máximo 5 MB.`
                  : 'Seleccione un archivo. Máximo 5 MB.'}
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
  <>

    {showDuplicateMemoModal && (
      <Modal
        titleId="duplicate-memo-modal-title"
        onClose={() => {
          setShowDuplicateMemoModal(false)
          setMemoSeleccionadoParaDuplicar(null)
        }}
        className="duplicate-modal"
        overlayClassName="duplicate-modal-overlay"
      >
          <div className="duplicate-modal-header">
            <div>
              <h2 id="duplicate-memo-modal-title">Duplicar Memo</h2>
              <p>Busque y seleccione el Memo que desea duplicar.</p>
            </div>
            <button
              type="button"
              className="duplicate-modal-close"
              onClick={() => {
                setShowDuplicateMemoModal(false)
                setMemoSeleccionadoParaDuplicar(null)
              }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <div className="duplicate-modal-body">
            <label className="duplicate-search-label">
              Buscar Memo
              <div className="duplicate-search-box">
                <Search size={16} aria-hidden="true" />
                <input
                  type="text"
                  value={memoDuplicadoBusqueda}
                  onChange={event => {
                    setMemoDuplicadoBusqueda(event.target.value)
                    setMemoSeleccionadoParaDuplicar(null)
                  }}
                  placeholder="N.º de Memo, expediente o asunto"
                  autoFocus
                />
              </div>
            </label>

            {memosParaDuplicar.length > 0 ? (
              <div className="duplicate-results">
                {memosParaDuplicar.map(memo => (
                  <button
                    key={memo.id}
                    type="button"
                    className={`duplicate-result${memoSeleccionadoParaDuplicar?.id === memo.id ? ' selected' : ''}`}
                    onClick={() => setMemoSeleccionadoParaDuplicar(memo)}
                  >
                    <div className="duplicate-result-top">
                      <strong>
                        {formatDocumentNumber(memo.nroMemo, memo.createdAt) ||
                          'Memo sin número'}
                      </strong>
                      <span>{memo.fecha || 'Sin fecha'}</span>
                    </div>
                    <div className="duplicate-result-subject">
                      {memo.asunto || 'Sin asunto'}
                    </div>
                    <div className="duplicate-result-details">
                      <span>
                        Expediente: {formatExpediente(
                          memo.nroExpediente,
                          memo.expedienteId
                        )}
                      </span>
                      <span>
                        {memo.areaDestino || 'Sin área destino'}
                        {getAreaCopia(memo.areaDestino) &&
                          ` · Con copia a: ${getAreaCopia(memo.areaDestino)}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="duplicate-empty">
                {memoDuplicadoBusqueda.trim()
                  ? 'No se encontraron Memos con esos datos.'
                  : 'No hay Memos disponibles para duplicar.'}
              </div>
            )}

            {memoSeleccionadoParaDuplicar && (
              <div className="duplicate-preview">
                <div className="duplicate-preview-header">
                  <strong>Memo que se duplicará</strong>
                </div>
                <div className="duplicate-preview-content">
                  <div>
                    <span>N.º de Memo original</span>
                    <strong>
                      {formatDocumentNumber(
                        memoSeleccionadoParaDuplicar.nroMemo,
                        memoSeleccionadoParaDuplicar.createdAt
                      )}
                    </strong>
                  </div>
                  <div>
                    <span>Expediente original</span>
                    <strong>
                      {formatExpediente(
                        memoSeleccionadoParaDuplicar.nroExpediente,
                        memoSeleccionadoParaDuplicar.expedienteId
                      )}
                    </strong>
                  </div>
                  <div className="duplicate-preview-wide">
                    <span>Asunto</span>
                    <strong>
                      {memoSeleccionadoParaDuplicar.asunto || 'Sin asunto'}
                    </strong>
                  </div>
                </div>
                <div className="duplicate-new-expediente">
                  <span>Resultado</span>
                  <strong>
                    Se creará un nuevo Memo para otro expediente; el original se conservará.
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className="duplicate-modal-footer">
            <button
              type="button"
              className="legacy-light-button"
              onClick={() => {
                setShowDuplicateMemoModal(false)
                setMemoSeleccionadoParaDuplicar(null)
              }}
            >
              Cancelar
            </button>
            {memoSeleccionadoParaDuplicar && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  onDuplicateMemo(memoSeleccionadoParaDuplicar)
                  setShowDuplicateMemoModal(false)
                  setMemoSeleccionadoParaDuplicar(null)
                }}
              >
                <Copy size={16} aria-hidden="true" /> Continuar con este Memo
              </button>
            )}
          </div>
      </Modal>
    )}

    {showMemoSelector && !expediente && (
      <Modal
        titleId="nuevo-memo-title"
        onClose={onCloseMemoSelector}
        className="memo-modal"
        overlayClassName="memo-modal-overlay"
      >
          <div className="memo-modal-header">

            <div>
              <p className="eyebrow">
                GESTIÓN DOCUMENTAL
              </p>

              <h2 id="nuevo-memo-title">
                    {memoParaDuplicar ? 'Duplicar Memo' : 'Nuevo Memo'}
              </h2>

              <p>
                    {memoParaDuplicar
                      ? `Elija un expediente diferente para crear una copia de ${formatDocumentNumber(memoParaDuplicar.nroMemo, memoParaDuplicar.createdAt)}.`
                      : 'Seleccione el expediente al que desea asociar el Memo.'}
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
                <h3>Seleccionar expediente disponible</h3>

                <p>
                  {memoParaDuplicar
                    ? 'Los expedientes que ya tienen un Memo no aparecen en esta lista.'
                    : 'Busque el expediente por número, asunto, remitente o área.'}
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

      </Modal>
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

          {canCreate && (
            <div className="memo-heading-actions">
              <button
                className="primary-button"
                onClick={onNewMemo}
              >
                ＋ Nuevo Memo
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  setMemoDuplicadoBusqueda('')
                  setMemoSeleccionadoParaDuplicar(null)
                  setShowDuplicateMemoModal(true)
                }}
              >
                <Copy size={16} aria-hidden="true" /> Duplicar Memo
              </button>
            </div>
          )}

        </div>

        <section className="panel list-panel">

          <div className="toolbar">

            <div className="search-box">

              <Search size={16} aria-hidden="true" />

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

            <table className="data-table memos-table">
             <caption className="sr-only">Listado de memos</caption>

             <thead>
              <tr>
                <th scope="col">N.º MEMO</th>
                <th scope="col">N.º EXPEDIENTE</th>
                <th scope="col">FECHA</th>
                <th scope="col">ASUNTO</th>
                <th scope="col">ÁREA DESTINO</th>
                <th scope="col">REALIZADO POR</th>
                <th scope="col">RESPONSABLE</th>
                <th scope="col">ESTADO</th>
                <th scope="col">ACCIONES</th>
              </tr>
            </thead>

              <tbody>

  {pageItems.map(memo => (
    <tr key={memo.id}>

      <td>
        <b className="exp-id">
          {formatDocumentNumber(memo.nroMemo, memo.createdAt)}
        </b>
      </td>

     <td>
  <b>
    {formatExpediente(memo.nroExpediente, memo.expedienteId)}
  </b>

 {(() => {
  const documentoExpediente =
    documentosExpedientes[String(memo.expedienteId)]

  if (!documentoExpediente?.archivoData) {
    return null
  }

  return (
    <div style={{ marginTop: '4px' }}>
      <MemoDocumentLink
        archivoData={documentoExpediente.archivoData}
        archivo={documentoExpediente.archivo}
      >
        {documentoExpediente.archivo}
      </MemoDocumentLink>
    </div>
  )
})()}
</td>

      <td>
        <span style={{ whiteSpace: 'nowrap' }}>
          {memo.fecha ? displayDate(memo.fecha) : '—'}
        </span>
      </td>

      <td>
        <div
          title={memo.asunto || '—'}
          style={{
            maxWidth: '250px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {memo.asunto || '—'}
        </div>

        {memo.archivoData && (
          <div style={{ marginTop: '6px' }}>
            <MemoDocumentLink
              archivoData={memo.archivoData}
              archivo={memo.archivo}
            >
              {memo.archivo}
            </MemoDocumentLink>
          </div>
        )}
      </td>
      {/* ÁREA DESTINO */}
      <td>
        <span
          title={memo.areaDestino || '—'}
          style={{
            display: 'block',
            maxWidth: '150px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '11px',
            color: '#374151'
          }}
        >
          {memo.areaDestino || '—'}
        </span>
        {getAreaCopia(memo.areaDestino) && (
          <small>
            Con copia a: {getAreaCopia(memo.areaDestino)}
          </small>
        )}
      </td>

      <td>
        <span
          title={memo.realizadoPor || 'No registrado'}
          style={{
            display: 'block',
            maxWidth: '150px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '11px',
            color: '#374151'
          }}
        >
          {memo.realizadoPor || 'No registrado'}
        </span>
      </td>

      {/* NUEVA COLUMNA RESPONSABLE */}
      <td>
        <span
          title={memo.responsable || '—'}
          style={{
            display: 'block',
            maxWidth: '150px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '11px',
            color: '#374151'
          }}
        >
          {memo.responsable || '—'}
        </span>
      </td>
      {/* ESTADO */}
      <td>
        <select
          className={`status-badge ${memo.estado.toLowerCase().replace(/\s+/g, '-')}`}
          value={memo.estado}
          disabled={!canAtender}
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

              <option value="Archivado" disabled={!canArchivar}>
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
            <option value="Archivado" disabled={!canArchivar}>
              Archivado
            </option>
          )}
        </select>
      </td>

      {/* MÁS DATOS */}
      <td>
        <button
          className="tracking-button"
          onClick={() => setSelectedMemo(memo)}
        >
          <Search size={16} aria-hidden="true" /> Ver más datos
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
              -{Math.min(currentPage * pageSize, memosFiltrados.length)}
            </b>{' '}
            de <b>{memosFiltrados.length}</b> Memos
            <button
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              ‹
            </button>
            <b className="current-page">{currentPage}</b>
            <button
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              ›
            </button>
          </div>

                </section>

        <MemoDetailsModal
          memo={selectedMemo}
          onClose={() => setSelectedMemo(null)}
        />

      </>
    )
  }
