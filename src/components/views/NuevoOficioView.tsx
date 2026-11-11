import { FormEvent, useEffect, useMemo, useState } from 'react'
import { FileUp, LoaderCircle } from 'lucide-react'
import { Expediente, Oficio } from '../../types'
import { formatNroExp, getSupportedDocumentMimeType } from '../../utils/expedienteHelpers'
import { useToast } from '../common/ToastProvider'
import {
  fetchOficioDestinatariosFrecuentes,
  registrarOficioDestinatario
} from '../../services/oficioDestinatariosService'

type Props = {
  expediente: Expediente | null
  onCancelar: () => void
  onGuardar: (datos: NuevoOficioData) => Promise<boolean>
  oficioParaEditar?: Oficio | null
}

export type NuevoOficioData = {
  expedienteId: string
  nroExpediente: string
  fecha: string
  areaDestino: string
  destinatario: string
  responsable: string
  asuntoTipo: string
  asuntoDetalle: string
  codigoOad: string
  codigoOgesup: string
  anio: number
  archivo: File | null
}

export default function NuevoOficioView({
  expediente,
  onCancelar,
  onGuardar,
  oficioParaEditar = null
}: Props) {
  const { toast } = useToast()
  const [fecha, setFecha] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [asuntoDetalle, setAsuntoDetalle] = useState('')
  const [areaDestino, setAreaDestino] = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [responsable, setResponsable] = useState('')
  const [destinatariosFrecuentes, setDestinatariosFrecuentes] = useState<string[]>([])
  const [archivo, setArchivo] = useState<File | null>(null)
  useEffect(() => {
    if (!oficioParaEditar) return
    setFecha(oficioParaEditar.fecha?.slice(0, 10) || '')
    setAsuntoDetalle(oficioParaEditar.asuntoDetalle)
    setAreaDestino(oficioParaEditar.areaDestino)
    setDestinatario(oficioParaEditar.destinatario)
    setResponsable(oficioParaEditar.responsable)
  }, [oficioParaEditar])

  const [guardando, setGuardando] = useState(false)
  const destinatariosFiltrados = useMemo(() => {
    const texto = destinatario.trim().toLowerCase()
    return destinatariosFrecuentes.filter(item =>
      !texto || item.toLowerCase().includes(texto)
    ).slice(0, 8)
  }, [destinatario, destinatariosFrecuentes])

  useEffect(() => {
    fetchOficioDestinatariosFrecuentes()
      .then(setDestinatariosFrecuentes)
      .catch(error => {
        console.error('Error cargando destinatarios frecuentes de Oficios:', error)
        toast('No se pudieron cargar las sugerencias de destinatarios.', 'warning')
      })
  }, [toast])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!expediente) {
      toast('Debe seleccionar un expediente.', 'warning')
      return
    }

    if (!asuntoDetalle.trim()) {
      toast('Ingrese el asunto del Oficio.', 'warning')
      return
    }

    if (!areaDestino.trim()) {
      toast('Ingrese el área o entidad destino del Oficio.', 'warning')
      return
    }

    if (!destinatario.trim()) {
      toast('Ingrese el destinatario del Oficio.', 'warning')
      return
    }

    if (!responsable.trim()) {
      toast('Ingrese el responsable del Oficio.', 'warning')
      return
    }

    if (archivo && !getSupportedDocumentMimeType(archivo)) {
      toast('Adjunte un archivo PDF, JPG, JPEG o PNG.', 'warning')
      return
    }

    if (archivo && archivo.size > 5 * 1024 * 1024) {
      toast('El archivo no puede superar los 5 MB.', 'warning')
      return
    }

    setGuardando(true)

    try {
      const guardado = await onGuardar({
        expedienteId: String(expediente.id),
        nroExpediente: String(expediente.nroExp),
        fecha,
        areaDestino: areaDestino.trim(),
        destinatario: destinatario.trim(),
        responsable: responsable.trim(),
        asuntoTipo: '',
        asuntoDetalle: asuntoDetalle.trim(),
        codigoOad: '',
        codigoOgesup: '',
        anio: new Date(`${fecha}T00:00:00`).getFullYear(),
        archivo
      })
      if (guardado) {
        try {
          await registrarOficioDestinatario(destinatario.trim())
        } catch (error) {
          console.error('Error guardando destinatario frecuente de Oficio:', error)
          toast('El Oficio se guardó, pero no se pudo actualizar la sugerencia.', 'warning')
        }
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <div className="page-heading compact document-form-header">
        <div>
          <p className="eyebrow">GESTIÓN DOCUMENTAL</p>
          <h1>{oficioParaEditar ? 'Editar Oficio' : 'Nuevo Oficio'}</h1>
          <p className="muted">
            Registre la fecha, el área o entidad destino, el destinatario externo, el responsable y el asunto.
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

            <div className="memo-expediente-info">
              <div>
                <strong>Expediente</strong>
                <p>{formatNroExp(expediente.nroExp, false, expediente.fechaIngreso)}</p>
              </div>
              <div>
                <strong>Remitente</strong>
                <p>{expediente.remitente || 'Sin especificar'}</p>
              </div>
              <div>
                <strong>Asunto del expediente</strong>
                <p>{expediente.asunto || 'Sin asunto'}</p>
              </div>
            </div>

            <div className="form-grid oficio-form-grid document-form-grid">
              <div className="form-group document-form-field">
                <label>Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
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
              <div className="form-group document-form-field">
                <label htmlFor="oficio-destinatario">Destinatario *</label>
                <input
                  id="oficio-destinatario"
                  type="text"
                  value={destinatario}
                  onChange={event => setDestinatario(event.target.value)}
                  list="oficio-destinatarios-frecuentes"
                  placeholder="Nombre o entidad destinataria"
                  required
                />
                <datalist id="oficio-destinatarios-frecuentes">
                  {destinatariosFiltrados.map(item => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>

              <div className="form-group document-form-field">
                <label htmlFor="oficio-area-destino">Área o entidad destino *</label>
                <input
                  id="oficio-area-destino"
                  type="text"
                  value={areaDestino}
                  onChange={event => setAreaDestino(event.target.value)}
                  placeholder="Nombre del área o entidad externa"
                  required
                />
              </div>

              <div className="form-group form-group-full document-form-field">
                <label htmlFor="oficio-responsable">Responsable *</label>
                <input
                  id="oficio-responsable"
                  type="text"
                  value={responsable}
                  onChange={event => setResponsable(event.target.value)}
                  placeholder="Nombre del responsable externo"
                  required
                />
              </div>

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

              <div className="form-group document-form-field">
                <label htmlFor="oficio-archivo">Adjunto (opcional)</label>
                <label className="document-form-file-button" htmlFor="oficio-archivo">
                  <><FileUp size={16} aria-hidden="true" /> Seleccionar archivo</>
                  <input
                    id="oficio-archivo"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={event => {
                      const file = event.target.files?.[0] || null
                      if (!file) {
                        setArchivo(null)
                        return
                      }

                      if (!getSupportedDocumentMimeType(file)) {
                        toast('Adjunte un archivo PDF, JPG, JPEG o PNG.', 'warning')
                        event.target.value = ''
                        setArchivo(null)
                        return
                      }

                      if (file.size > 5 * 1024 * 1024) {
                        toast('El archivo no puede superar los 5 MB.', 'warning')
                        event.target.value = ''
                        setArchivo(null)
                        return
                      }

                      setArchivo(file)
                    }}
                  />
                </label>
                <small>
                  {archivo
                    ? `Seleccionado: ${archivo.name}`
                    : 'PDF o imagen JPG/PNG. Máximo 5 MB.'}
                </small>
                {archivo && (
                  <button
                    type="button"
                    className="action-link"
                    onClick={() => setArchivo(null)}
                    disabled={guardando}
                  >
                    Quitar archivo
                  </button>
                )}
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
              {guardando ? (
                <><LoaderCircle className="button-spinner" size={16} aria-hidden="true" /> Guardando...</>
              ) : (
                'Guardar Oficio'
              )}
            </button>
          </div>
        </form>
      )}
    </>
  )
}