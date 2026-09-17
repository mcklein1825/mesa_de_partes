import { useState, FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatNroExp, todayInputValue } from '../../utils/expedienteHelpers'

export default function NewExpedienteView({
  onSubmit, onCancel, isSaving
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [showExtraFields, setShowExtraFields] = useState(false)
  const [modoDuplicado, setModoDuplicado] = useState(false)
  const [duplicadoBusqueda, setDuplicadoBusqueda] = useState('')
  const [duplicadoResultados, setDuplicadoResultados] = useState<any[]>([])
  const [duplicadoSeleccionado, setDuplicadoSeleccionado] = useState<any | null>(null)
  const [numeroExpedienteClonado, setNumeroExpedienteClonado] = useState('')
  const [buscandoDuplicado, setBuscandoDuplicado] = useState(false)

  const buscarExpedientesDuplicado = async () => {
    const termino = duplicadoBusqueda.trim()
    if (!termino) { setDuplicadoResultados([]); return }

    setBuscandoDuplicado(true)
    try {
      const esNumero = /^\d+$/.test(termino)
      let query = supabase.from('mesa_partes_2026').select('id, nro_exp, fecha, nombre_apellido, asunto').limit(10)

      if (esNumero) {
        query = query.eq('nro_exp', Number(termino))
      } else {
        query = query.or(`nombre_apellido.ilike.%${termino}%,asunto.ilike.%${termino}%`)
      }

      const { data, error } = await query
      if (error) { console.error('Error buscando expediente para duplicar:', error); setDuplicadoResultados([]); return }
      setDuplicadoResultados(data || [])
    } finally {
      setBuscandoDuplicado(false)
    }
  }

  return (
    <div className="legacy-form-page">
      <form className="form-layout" onSubmit={onSubmit}>
        <div className="duplicate-toggle">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={modoDuplicado} onChange={(e) => setModoDuplicado(e.target.checked)} />
            <span>Duplicar expediente existente</span>
          </label>
        </div>

        {modoDuplicado && (
          <div className="duplicate-search-panel">
            <label>
              Buscar expediente a duplicar
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <input type="text" value={duplicadoBusqueda} onChange={(e) => setDuplicadoBusqueda(e.target.value)} placeholder="N.º de expediente, nombre o asunto" />
                <button type="button" onClick={buscarExpedientesDuplicado} disabled={buscandoDuplicado}>
                  {buscandoDuplicado ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </label>

            {duplicadoResultados.length > 0 && (
              <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
                {duplicadoResultados.map((item) => (
                  <div key={item.id} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}>
                    <strong>{formatNroExp(String(item.nro_exp))}</strong>
                    <div>{item.nombre_apellido || 'Sin nombre'}</div>
                    <div>{item.asunto || 'Sin asunto'}</div>
                    <div>{item.fecha || 'Sin fecha'}</div>
                    <button type="button" onClick={() => {
                      setDuplicadoSeleccionado(item)
                      const numero = formatNroExp(String(item.nro_exp))
                      setNumeroExpedienteClonado(numero.endsWith('*') ? numero : `${numero}*`)
                    }}>Seleccionar</button>
                  </div>
                ))}
              </div>
            )}

            {duplicadoSeleccionado && (
              <div style={{ marginTop: '15px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }}>
                <strong>Expediente seleccionado:</strong>
                <div>{formatNroExp(String(duplicadoSeleccionado.nro_exp))}</div>
                <div>{duplicadoSeleccionado.nombre_apellido}</div>
                <div style={{ marginTop: '10px', padding: '10px', borderRadius: '6px', background: '#f5f5f5' }}>
                  <strong>Nuevo expediente:</strong>
                  <div>{numeroExpedienteClonado}</div>
                </div>
                <input type="hidden" name="duplicadoDesdeId" value={duplicadoSeleccionado.id} />
                <input type="hidden" name="esDuplicado" value="true" />
              </div>
            )}
          </div>
        )}

        {isSaving && <div className="saving-notice">Guardando archivo y expediente en Supabase...</div>}

        <div className="legacy-title">▣ Registro de Expediente MPV</div>

        <section className="panel form-panel">
          <div className="panel-header">
            <div><h2>Datos del trámite</h2><p>Complete los datos solicitados para registrar el expediente.</p></div>
          </div>
          <div className="form-grid">
            <label>Fecha de ingreso<input name="fechaIngreso" type="date" required defaultValue={todayInputValue()} /></label>
            <label>Trámite
              <select name="tipo" required>
                <option value="">Seleccione el tipo</option>
                <option>Solicitud</option><option>Oficio</option><option>Memorando</option>
                <option>Informe</option><option>Carta</option><option>Resolución</option>
              </select>
            </label>
            <label className="wide">Nombre / apellido o razón social<input name="remitente" required placeholder="Ingrese el nombre completo o razón social." /></label>
            <label>Cargo del remitente<input name="cargoRemitente" placeholder="Cargo o función del remitente" /></label>
            <label className="wide">Asunto de la solicitud<input name="asunto" required placeholder="Registre en forma clara el asunto por el cual ingresa el documento." /></label>
            <label className="wide">Documentos<input name="documentos" required placeholder="Ej. Oficio Múltiple N.° 00129-2025-MINEDU/..." /></label>
          </div>
        </section>

        <div className="extra-fields-toggle">
          <button type="button" className="extra-fields-button" onClick={() => setShowExtraFields(!showExtraFields)}>
            {showExtraFields ? '− Ocultar campos extra' : '＋ Mostrar campos extra'}
          </button>
        </div>

        {showExtraFields && (
          <section className="panel form-panel">
            <div className="section-strip">▣ Datos del administrado</div>
            <div className="form-grid">
              <label>Tipo de documento
                <select name="tipoDocumento"><option value="RUC">RUC</option><option value="DNI">DNI</option><option value="CE">CE</option></select>
              </label>
              <label>Número de documento
                <div className="inline-field">
                  <input name="numeroDocumento" placeholder="Número de documento" />
                  <button type="button" className="legacy-blue-button">⌕ Validar</button>
                </div>
              </label>
              <label>Representante (si aplica)<input name="representante" placeholder="Nombre del representante" /></label>
              <label>Cargo del representante<input name="cargoRepresentante" placeholder="Cargo" /></label>
              <label className="wide">Contenido<textarea name="contenido" placeholder="Ingrese el detalle de la solicitud" rows={3} /></label>
              <label className="wide">Dirección<input name="direccion" placeholder="Ingrese la Dirección" /></label>
              <label>Correo electrónico<input name="correo" type="email" placeholder="Correo electrónico" /></label>
              <label>Celular<input name="celular" placeholder="Teléfono de contacto" /></label>
              <label>Folios<input name="folios" type="number" min="1" required defaultValue="1" /></label>
              <label>Anexos<input name="anexos" type="number" min="0" required defaultValue="0" /></label>
              <label>Prioridad
                <select name="prioridad" required><option value="Normal">Normal</option><option value="Alta">Alta</option></select>
              </label>
            </div>
          </section>
        )}

        <section className="panel form-panel">
          <div className="section-strip">▣ Recepción y seguimiento</div>
          <div className="form-grid">
            <label>Recibido presencial/virtual
              <select name="canalRecepcion" required>
                <option value="">Seleccione el canal</option>
                <option>Físico</option><option>Plataforma SINAD</option><option>Virtual</option><option>Presencial</option>
              </select>
            </label>
            <label className="wide">Documento seguimiento<input name="documentoSeguimiento" placeholder="Ej. Informe técnico o memorando" /></label>
          </div>
        </section>

        <section className="panel form-panel">
          <div className="section-strip">▣ Archivos a Adjuntar</div>
          <div className="form-grid attachment-grid">
            <div>
              <label>Archivo</label>
              <label className="file-button">
                ▣ Seleccionar archivo
                <input name="archivo" type="file" accept=".pdf,.jpg,.jpeg,.png" required onChange={event => setSelectedFileName(event.target.files?.[0]?.name || '')} />
              </label>
              <small>{selectedFileName ? `Seleccionado: ${selectedFileName}` : 'Máximo 5 MB.'}</small>
            </div>
            <label>Descripción del archivo<input name="archivoDescripcion" placeholder="Descripción del archivo" /></label>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" className="legacy-light-button" onClick={onCancel}>‹ Anterior</button>
          <button type="submit" className="legacy-blue-button" disabled={isSaving}>✓ Enviar</button>
          <button type="reset" className="legacy-blue-button" disabled={isSaving} onClick={() => setSelectedFileName('')}>▰ Limpiar</button>
        </div>
      </form>
    </div>
  )
}