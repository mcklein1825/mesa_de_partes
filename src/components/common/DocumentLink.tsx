import {
  ChangeEvent,
  ReactNode,
  useRef,
  useState
} from 'react'
import { supabase } from '../../lib/supabaseClient'
import { Expediente, Proveido } from '../../types'

export default function DocumentLink({
  item,
  children,
  onAttach
}: {
  item: Expediente
  children?: ReactNode
  onAttach?: (file: File) => Promise<void>
}) {
  const [cargando, setCargando] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const tieneDocumento =
    Boolean(item.archivo) &&
    item.archivo !== 'Sin adjunto'

  const textoVisible =
    children ||
    (item.archivo && item.archivo !== 'Sin adjunto'
      ? item.archivo
      : 'Sin asunto')

  const abrirArchivo = async () => {
    if (cargando || !tieneDocumento) return

    const nuevaVentana = window.open('', '_blank')

    if (!nuevaVentana) {
      alert(
        'El navegador bloqueó la ventana emergente. Permita las ventanas emergentes para este sitio.'
      )
      return
    }

    setCargando(true)

    try {
      const { data, error } = await supabase
        .from('mesa_partes_2026')
        .select(
          'archivo_data, archivo_tipo, archivo'
        )
        .eq('id', item.id)
        .single()

      if (error || !data?.archivo_data) {
        nuevaVentana.close()

        alert(
          error
            ? 'No se pudo cargar el archivo.'
            : 'Este expediente no tiene el archivo almacenado.'
        )

        return
      }

      const base64 = data.archivo_data.includes(',')
        ? data.archivo_data.split(',')[1]
        : data.archivo_data

      const byteCharacters = atob(base64)
      const byteNumbers = new Array(
        byteCharacters.length
      )

      for (
        let i = 0;
        i < byteCharacters.length;
        i++
      ) {
        byteNumbers[i] =
          byteCharacters.charCodeAt(i)
      }

      const byteArray = new Uint8Array(
        byteNumbers
      )

      const blob = new Blob(
        [byteArray],
        {
          type:
            data.archivo_tipo ||
            'application/pdf'
        }
      )

      const url =
        URL.createObjectURL(blob)

      nuevaVentana.location.href = url

      setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 60000)

    } catch (error) {
      nuevaVentana.close()

      console.error(
        'Error inesperado al abrir archivo:',
        error
      )

      alert(
        'Ocurrió un error al abrir el archivo.'
      )

    } finally {
      setCargando(false)
    }
  }

  const seleccionarArchivo = () => {
    inputRef.current?.click()
  }

  const manejarArchivo = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0]

    event.target.value = ''

    if (!file || !onAttach) return

    await onAttach(file)
  }

  /*
   * =========================================================
   * SIN DOCUMENTO
   * =========================================================
   */

  if (!tieneDocumento) {
    return (
      <span className="document-pending">
       <span
          className="document-text-without-file"
          title={
            item.asunto
              ? 'Documento pendiente de adjuntar'
              : 'Sin asunto ni documento'
          }
        >
          {textoVisible}
        </span>

        {item.asunto && (
          <span className="document-missing">
            ⚠ Falta documento
          </span>
        )}

        {onAttach && (
          <>
            <button
              type="button"
              className="document-attach-button"
              onClick={seleccionarArchivo}
              disabled={cargando}
            >
              📎 Adjuntar
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={manejarArchivo}
            />
          </>
        )}
      </span>
    )
  }

  /*
   * =========================================================
   * CON DOCUMENTO
   *
   * El ASUNTO se convierte en el enlace del documento.
   * Si no existe asunto, se muestra el nombre del archivo.
   * =========================================================
   */

  return (
    <button
      type="button"
      className="document-link"
      onClick={abrirArchivo}
      disabled={cargando}
      title={`Abrir ${item.archivo}`}
    >
      {cargando
        ? '⏳ Cargando...'
        : textoVisible}
    </button>
  )
}

