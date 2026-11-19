const MAX_LADO = 1600
const CALIDAD = 0.82

const esImagen = (file: File) => /^image\/(jpeg|jpg|png|webp|gif|bmp)$/i.test(file.type)

const comprimirImagen = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const esc = Math.min(1, MAX_LADO / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * esc))
        const h = Math.max(1, Math.round(img.height * esc))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('canvas no disponible'))
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', CALIDAD))
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('no se pudo leer la imagen'))
    }
    img.src = url
  })

/**
 * Sustituye a reader.readAsDataURL(file): si es imagen la recomprime
 * (max 1600 px, JPEG 0.82) y entrega el dataURL por onload/onloadend;
 * si no es imagen (PDF, etc.) lo lee tal cual. Si la compresion falla,
 * cae al lectura original sin romper el guardado.
 */
export const leerArchivoOptimizado = (reader: FileReader, file: File) => {
  const entregar = (dataUrl: string) => {
    const ev = { target: { result: dataUrl } } as unknown as ProgressEvent<FileReader>
    if (reader.onload) reader.onload(ev)
    if (reader.onloadend) reader.onloadend(ev)
  }
  if (!esImagen(file)) {
    reader.readAsDataURL(file)
    return
  }
  comprimirImagen(file)
    .then(entregar)
    .catch(() => reader.readAsDataURL(file))
}