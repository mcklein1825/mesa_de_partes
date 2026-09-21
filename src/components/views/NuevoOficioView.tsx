import { FormEvent, useState } from 'react'
import { Expediente } from '../../types'
import {
  AREAS_RESPONSABLES,
  obtenerResponsablePorArea
} from '../../utils/areasResponsables'

type Props = {
  expediente: Expediente | null
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
  onCancelar,
  onGuardar
}: Props) {
  const [fecha, setFecha] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [destinatario, setDestinatario] = useState('')

  const [asuntoTipo, setAsuntoTipo] = useState('')

  const [asuntoDetalle, setAsuntoDetalle] = useState(
    expediente?.asunto || ''
  )

  // El área destino se selecciona al crear el Oficio.
  // NO se obtiene del expediente.
  const [areaDestino, setAreaDestino] = useState('')

  const [codigoOad, setCodigoOad] = useState('')
  const [codigoOgesup, setCodigoOgesup] = useState('')

  const [guardando, setGuardando] = useState(false)

  // El responsable se obtiene automáticamente según el área seleccionada.
  const responsableInfo = obtenerResponsablePorArea(areaDestino)

  const responsable = responsableInfo?.responsable || ''

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

    if (!destinatario.trim()) {
      alert('Ingrese el destinatario.')
      return
    }

    if (!asuntoDetalle.trim()) {
      alert('Ingrese el detalle del asunto.')
      return
    }

    setGuardando(true)

    try {
      await onGuardar({
        expedienteId: String(expediente.id),
        nroExpediente: String(expediente.nroExp),
        fecha,
        destinatario: destinatario.trim(),
        asuntoTipo: asuntoTipo.trim(),
        asuntoDetalle: asuntoDetalle.trim(),
        responsable: responsable.trim(),
        codigoOad: codigoOad.trim(),
        codigoOgesup: codigoOgesup.trim(),
        anio: new Date(`${fecha}T00:00:00`).getFullYear(),
        areaDestino: areaDestino.trim()
      })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="view-section">
      <div className="page-header">
        <div>
          <h1>Nuevo Oficio</h1>
          <p>
            Registro de un oficio vinculado a un expediente.
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
        <div className="empty-state">
          Seleccione primero un expediente para registrar el oficio.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-card">
            <h2>Expediente</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>N.° Expediente</label>
                <input
                  type="text"
                  value={expediente.nroExp || ''}
                  readOnly
                />
              </div>

              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Área destino *</label>

                <select
                  value={areaDestino}
                  onChange={e => setAreaDestino(e.target.value)}
                  required
                >
                  <option value="">
                    Seleccione un área
                  </option>

                  {AREAS_RESPONSABLES.map(item => (
                    <option
                      key={item.area}
                      value={item.area}
                    >
                      {item.area}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Responsable</label>

                <input
                  type="text"
                  value={responsable}
                  readOnly
                  placeholder="Se completará automáticamente"
                />

                {responsableInfo?.cargo && (
                  <small>
                    {responsableInfo.cargo}
                  </small>
                )}
              </div>
            </div>
          </div>

          <div className="form-card">
            <h2>Datos del Oficio</h2>

            <div className="form-grid">
              <div className="form-group">
                <label>Destinatario *</label>

                <input
                  type="text"
                  value={destinatario}
                  onChange={e => setDestinatario(e.target.value)}
                  placeholder="Nombre del destinatario"
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de asunto</label>

                <input
                  type="text"
                  value={asuntoTipo}
                  onChange={e => setAsuntoTipo(e.target.value)}
                  placeholder="Ej. Solicitud, Comunicación, Respuesta..."
                />
              </div>

              <div className="form-group form-group-full">
                <label>Detalle del asunto *</label>

                <textarea
                  value={asuntoDetalle}
                  onChange={e => setAsuntoDetalle(e.target.value)}
                  placeholder="Detalle del asunto del oficio"
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label>Código OAD</label>

                <input
                  type="text"
                  value={codigoOad}
                  onChange={e => setCodigoOad(e.target.value)}
                  placeholder="Código OAD"
                />
              </div>

              <div className="form-group">
                <label>Código OGESUP</label>

                <input
                  type="text"
                  value={codigoOgesup}
                  onChange={e => setCodigoOgesup(e.target.value)}
                  placeholder="Código OGESUP"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
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
    </section>
  )
}