import { FormEvent, useState } from 'react'
import { Expediente } from '../../types'

type Props = {
  expediente: Expediente | null
  responsable: string
  onCancelar: () => void
  onGuardar: (datos: NuevoOficioData) => Promise<void>
}

export type NuevoOficioData = {
  expedienteId: string
  nroExpediente: string
  fecha: string
  destinatario: string
  asuntoTipo: string
  asuntoDetalle: string
  responsable: string
  codigoOad: string
  codigoOgesup: string
  anio: number
  areaDestino: string
}

export default function NuevoOficioView({
  expediente,
  responsable,
  onCancelar,
  onGuardar
}: Props) {
  const [fecha, setFecha] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [asuntoDetalle, setAsuntoDetalle] = useState('')
  const [areaDestino, setAreaDestino] = useState('')

  const [guardando, setGuardando] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!expediente) {
      alert('Debe seleccionar un expediente.')
      return
    }

    if (!areaDestino) {
      alert('Seleccione el área destino.')
      return
    }

    if (!asuntoDetalle.trim()) {
      alert('Ingrese el asunto del Oficio.')
      return
    }

    if (!responsable.trim()) {
      alert('Ingrese el nombre de la persona responsable del documento.')
      return
    }

    setGuardando(true)

    try {
      await onGuardar({
        expedienteId: String(expediente.id),
        nroExpediente: String(expediente.nroExp),
        fecha,
        destinatario: '',
        asuntoTipo: '',
        asuntoDetalle: asuntoDetalle.trim(),
        responsable: responsable.trim(),
        codigoOad: '',
        codigoOgesup: '',
        anio: new Date(`${fecha}T00:00:00`).getFullYear(),
        areaDestino: areaDestino.trim()
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="page-heading compact document-form-header">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>Nuevo Oficio</h1>
          <p className="muted">
            Registre la fecha, el área de destino, el asunto y el responsable del Oficio.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>
      </div>

      {!expediente ? (
        <div className="panel empty-state" style={{ padding: '30px', textAlign: 'center' }}>
          Seleccione primero un expediente para registrar el oficio.
        </div>
      ) : (
        <form className="oficio-form document-form-layout" onSubmit={handleSubmit}>
          <div className="panel form-card oficio-form-card document-form-card">
            <div className="document-form-section-header">
              <h2>Expediente relacionado</h2>
              <p>El Oficio quedará vinculado a este expediente.</p>
            </div>

            <div className="form-grid oficio-form-grid document-form-grid">
              <div className="form-group document-form-field">
                <label>N.° Expediente</label>
                <input
                  type="text"
                  value={expediente.nroExp || ''}
                  readOnly
                />
              </div>

              <div className="form-group document-form-field">
                <label>Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  required
                />
              </div>

              <div className="form-group document-form-field">
                <label>Área de destino DRELM *</label>
                <input
                  type="text"
                  value={areaDestino}
                  onChange={event => setAreaDestino(event.target.value)}
                  placeholder="Ej. DRELM - OAJ"
                  required
                />
              </div>

              <div className="form-group document-form-field">
                <label>Responsable (quien elaboró el documento) *</label>
                <input
                  type="text"
                  value={responsable}
                  readOnly
                  placeholder="Se completará con el usuario actual"
                  required
                />
              </div>
            </div>
          </div>

          <div className="panel form-card oficio-form-card document-form-card">
            <div className="document-form-section-header">
              <h2>Datos del Oficio</h2>
              <p>Complete el asunto correspondiente al documento.</p>
            </div>

            <div className="form-grid oficio-form-grid document-form-grid">
              <div className="form-group form-group-full document-form-field document-form-field-wide">
                <label>Asunto *</label>

                <textarea
                  value={asuntoDetalle}
                  onChange={e => setAsuntoDetalle(e.target.value)}
                  placeholder="Ej. Remito copia de legajo del docente"
                  rows={3}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-actions oficio-form-actions document-form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onCancelar}
              disabled={guardando}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar Oficio'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}