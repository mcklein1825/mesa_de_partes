import { useState, FormEvent } from 'react'
import { todayInputValue, formatNroExp } from '../../utils/expedienteHelpers'

type ExpedienteParaDuplicar = {
  id: string
  nroExp: string
  fechaIngreso?: string
  remitente?: string
  remitenteNombre?: string
  asunto?: string
  contenido?: string
  area?: string
  areaDestino?: string
  estado?: string
}

type Props = {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  isSaving: boolean
  expedienteParaDuplicar: ExpedienteParaDuplicar | null
}

export default function NewExpedienteView({
  onSubmit,
  onCancel,
  isSaving,
  expedienteParaDuplicar
}: Props) {
  const [selectedFileName, setSelectedFileName] = useState('')
  const [showExtraFields, setShowExtraFields] = useState(false)

  return (
    <div className="expediente-form-page">
      <form className="form-layout" onSubmit={onSubmit}>

        {expedienteParaDuplicar && (
          <>
            <div
              style={{
                marginBottom: '20px',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #c5d2d8',
                background: '#f5f8fa'
              }}
            >
              <strong>
                Expediente seleccionado para duplicar
              </strong>

              <div style={{ marginTop: '8px' }}>
                Expediente original:{' '}
                <strong>
                  {formatNroExp(
                    String(expedienteParaDuplicar.nroExp)
                  )}
                </strong>
              </div>

              <div>
                Remitente:{' '}
                {expedienteParaDuplicar.remitenteNombre ||
                  expedienteParaDuplicar.remitente ||
                  'Sin nombre'}
              </div>

              <div>
                Asunto:{' '}
                {expedienteParaDuplicar.asunto ||
                  'Sin asunto'}
              </div>

              <div
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '6px',
                  background: '#ffffff'
                }}
              >
                <strong>Nuevo expediente:</strong>{' '}
                {formatNroExp(
                  String(expedienteParaDuplicar.nroExp)
                )}{' '}
                *
              </div>

              <input
                type="hidden"
                name="duplicadoDesdeId"
                value={expedienteParaDuplicar.id}
              />

              <input
                type="hidden"
                name="esDuplicado"
                value="true"
              />
            </div>
          </>
        )}

        {isSaving && (
          <div className="saving-notice">
            Guardando archivo y expediente en Supabase...
          </div>
        )}

        <div className="page-heading compact">
          <div>
            <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
            <h1>Registro de Expediente</h1>
            <p className="muted">
              Complete los datos solicitados para registrar el expediente.
            </p>
          </div>
        </div>

        <section className="panel form-panel">
          <div className="panel-header">
            <div>
              <h2>Datos del expediente</h2>
              <p>
                Complete los datos solicitados para registrar el expediente.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <label>
              Fecha de ingreso
              <input
                name="fechaIngreso"
                type="date"
                required
                defaultValue={todayInputValue()}
              />
            </label>

            <label className="wide">
              Nombre / apellido o razón social
              <input
                name="remitente"
                required
                placeholder="Ingrese el nombre completo o razón social."
                defaultValue={
                  expedienteParaDuplicar?.remitenteNombre ||
                  expedienteParaDuplicar?.remitente ||
                  ''
                }
              />
            </label>

            <label className="wide">
              Asunto de la solicitud
              <input
                name="asunto"
                required
                placeholder="Registre en forma clara el asunto por el cual ingresa el documento."
                defaultValue={
                  expedienteParaDuplicar?.asunto || ''
                }
              />
            </label>

            <label className="wide">
              Documentos
              <input
                name="documentos"
                required
                placeholder="Ej. Oficio Múltiple N.° 00129-2025-MINEDU/..."
              />
            </label>
          </div>
        </section>

        <div className="extra-fields-toggle">
          <button
            type="button"
            className="extra-fields-button"
            onClick={() =>
              setShowExtraFields(!showExtraFields)
            }
          >
            {showExtraFields
              ? '− Ocultar campos extra'
              : '＋ Mostrar campos extra'}
          </button>
        </div>

        {showExtraFields && (
          <section className="panel form-panel">
            <div className="section-strip">
              ▣ Datos del administrado
            </div>

            <div className="form-grid">
              <label>
                Tipo de documento
                <select name="tipoDocumento">
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                </select>
              </label>

              <label>
                Número de documento
                <div className="inline-field">
                  <input
                    name="numeroDocumento"
                    placeholder="Número de documento"
                  />

                  <button
                    type="button"
                    className="legacy-blue-button"
                  >
                    ⌕ Validar
                  </button>
                </div>
              </label>

              <label>
                Representante (si aplica)
                <input
                  name="representante"
                  placeholder="Nombre del representante"
                />
              </label>

              <label>
                Cargo del representante
                <input
                  name="cargoRepresentante"
                  placeholder="Cargo"
                />
              </label>

              <label className="wide">
                Contenido
                <textarea
                  name="contenido"
                  placeholder="Ingrese el detalle de la solicitud"
                  rows={3}
                />
              </label>

              <label className="wide">
                Dirección
                <input
                  name="direccion"
                  placeholder="Ingrese la Dirección"
                />
              </label>

              <label>
                Correo electrónico
                <input
                  name="correo"
                  type="email"
                  placeholder="Correo electrónico"
                />
              </label>

              <label>
                Celular
                <input
                  name="celular"
                  placeholder="Teléfono de contacto"
                />
              </label>

              <label>
                Folios
                <input
                  name="folios"
                  type="number"
                  min="1"
                  required
                  defaultValue="1"
                />
              </label>

              <label>
                Anexos
                <input
                  name="anexos"
                  type="number"
                  min="0"
                  required
                  defaultValue="0"
                />
              </label>

              <label>
                Prioridad
                <select
                  name="prioridad"
                  required
                >
                  <option value="Normal">
                    Normal
                  </option>

                  <option value="Alta">
                    Alta
                  </option>
                </select>
              </label>
            </div>
          </section>
        )}

        <section className="panel form-panel">
          <div className="section-strip">
            ▣ Recepción y seguimiento
          </div>

          <div className="form-grid">
            <label>
              Recibido presencial/virtual

              <select
                name="canalRecepcion"
                required
              >
                <option value="">
                  Seleccione el canal
                </option>

                <option>
                  Físico
                </option>

                <option>
                  Plataforma SINAD
                </option>

                <option>
                  Virtual
                </option>

                <option>
                  Presencial
                </option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel form-panel">
          <div className="section-strip">
            ▣ Archivos a Adjuntar
          </div>

          <div className="form-grid attachment-grid">
            <div>
              <label>
                Archivo
              </label>

              <label className="file-button">
                ▣ Seleccionar archivo

                <input
                  name="archivo"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={event =>
                    setSelectedFileName(
                      event.target.files?.[0]?.name || ''
                    )
                  }
                />
              </label>

              <small>
                {selectedFileName
                  ? `Seleccionado: ${selectedFileName}`
                  : 'Opcional. Puede adjuntarlo ahora o posteriormente. Máximo 5 MB.'}
              </small>
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button
            type="button"
            className="legacy-light-button"
            onClick={onCancel}
          >
            ‹ Anterior
          </button>

          <button
            type="submit"
            className="legacy-blue-button"
            disabled={isSaving}
          >
            ✓ Enviar
          </button>

          <button
            type="reset"
            className="legacy-blue-button"
            disabled={isSaving}
            onClick={() =>
              setSelectedFileName('')
            }
          >
            ▰ Limpiar
          </button>
        </div>

      </form>
    </div>
  )
}