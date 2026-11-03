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
    <div className="expediente-form-page document-form-page">
      <div className="page-heading compact document-form-header">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Registro de Expediente</h1>
          <p className="muted">
            Complete los datos solicitados para registrar el expediente.
          </p>
        </div>
      </div>

      <form className="form-layout document-form-layout" onSubmit={onSubmit}>
        {expedienteParaDuplicar && (
          <section className="panel document-form-card">
            <div className="document-form-section-header">
              <h2>Expediente relacionado</h2>
              <p>Se registrará un nuevo expediente vinculado al original.</p>
            </div>

            <div className="document-form-info">
              <div>
                <strong>Expediente original</strong>
                <p>{formatNroExp(String(expedienteParaDuplicar.nroExp))}</p>
              </div>
              <div>
                <strong>Remitente</strong>
                <p>
                  {expedienteParaDuplicar.remitenteNombre ||
                    expedienteParaDuplicar.remitente ||
                    'Sin nombre'}
                </p>
              </div>
              <div>
                <strong>Asunto</strong>
                <p>{expedienteParaDuplicar.asunto || 'Sin asunto'}</p>
              </div>
            </div>

            <div className="document-form-duplicate-summary">
              <strong>Nuevo expediente:</strong>{' '}
              {formatNroExp(String(expedienteParaDuplicar.nroExp))} *
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
          </section>
        )}

        {isSaving && (
          <div className="saving-notice">
            Guardando archivo y expediente en Supabase...
          </div>
        )}

        <section className="panel form-panel document-form-card">
          <div className="document-form-section-header">
            <h2>Datos del expediente</h2>
            <p>Complete los datos principales del documento recibido.</p>
          </div>

          <div className="form-grid document-form-grid">
            <label className="document-form-field">
              Fecha de ingreso
              <input
                name="fechaIngreso"
                type="date"
                required
                defaultValue={todayInputValue()}
              />
            </label>
            <label className="document-form-field">
              Fecha límite (opcional)
              <input
                name="plazo"
                type="date"
              />
            </label>


            <label className="wide document-form-field document-form-field-wide">
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

            <label className="wide document-form-field document-form-field-wide">
              Asunto de la solicitud
              <input
                name="asunto"
                placeholder="Registre en forma clara el asunto por el cual ingresa el documento."
                defaultValue={
                  expedienteParaDuplicar?.asunto || ''
                }
              />
            </label>

            <label className="wide document-form-field document-form-field-wide">
              Documentos
              <input
                name="documentos"
                required
                placeholder="Ej. Oficio Múltiple N.° 00129-2025-MINEDU/..."
              />
            </label>
          </div>
        </section>

        <div className="extra-fields-toggle document-form-extra-toggle">
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
          <section className="panel form-panel document-form-card">
            <div className="document-form-section-header">
              <h2>Datos del administrado</h2>
              <p>Información adicional de la persona o entidad remitente.</p>
            </div>

            <div className="form-grid document-form-grid">
              <label className="document-form-field">
                Tipo de documento
                <select name="tipoDocumento">
                  <option value="RUC">RUC</option>
                  <option value="DNI">DNI</option>
                  <option value="CE">CE</option>
                </select>
              </label>

              <label className="document-form-field">
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

              <label className="document-form-field">
                Representante (si aplica)
                <input
                  name="representante"
                  placeholder="Nombre del representante"
                />
              </label>

              <label className="document-form-field">
                Cargo del representante
                <input
                  name="cargoRepresentante"
                  placeholder="Cargo"
                />
              </label>

              <label className="wide document-form-field document-form-field-wide">
                Contenido
                <textarea
                  name="contenido"
                  placeholder="Ingrese el detalle de la solicitud"
                  rows={3}
                />
              </label>

              <label className="wide document-form-field document-form-field-wide">
                Dirección
                <input
                  name="direccion"
                  placeholder="Ingrese la Dirección"
                />
              </label>

              <label className="document-form-field">
                Correo electrónico
                <input
                  name="correo"
                  type="email"
                  placeholder="Correo electrónico"
                />
              </label>

              <label className="document-form-field">
                Celular
                <input
                  name="celular"
                  placeholder="Teléfono de contacto"
                />
              </label>

              <label className="document-form-field">
                Folios
                <input
                  name="folios"
                  type="number"
                  min="1"
                  required
                  defaultValue="1"
                />
              </label>

              <label className="document-form-field">
                Anexos
                <input
                  name="anexos"
                  type="number"
                  min="0"
                  required
                  defaultValue="0"
                />
              </label>

              <label className="document-form-field">
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

        <section className="panel form-panel document-form-card">
          <div className="document-form-section-header">
            <h2>Recepción y seguimiento</h2>
            <p>Indique por qué canal se recibió el expediente.</p>
          </div>

          <div className="form-grid document-form-grid">
            <label className="document-form-field">
              Recibido

              <select
                name="canalRecepcion"
                required
              >
                <option value="">
                  Seleccione el canal
                </option>

                <option value="Mesa de Partes Presencial">
                  Mesa de Partes Presencial
                </option>

                <option value="Mesa de Partes Virtual">
                  Mesa de Partes Virtual
                </option>

                <option value="Correo Institucional">
                  Correo Institucional
                </option>

                <option value="Presencial">
                  Presencial
                </option>
              </select>
            </label>
          </div>
        </section>

        <section className="panel form-panel document-form-card">
          <div className="document-form-section-header">
            <h2>Archivos a adjuntar</h2>
            <p>Adjunte el documento principal que acompaña el trámite.</p>
          </div>

          <div className="form-grid attachment-grid document-form-grid">
            <div className="document-form-field document-form-field-wide">
              <label>
                Archivo
              </label>

              <label className="file-button document-form-file-button">
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

        <div className="form-actions document-form-actions">
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