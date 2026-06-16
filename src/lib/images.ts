// Client-side image processing for profile photos. No external deps: relies on
// createImageBitmap + canvas.toBlob, both available in modern browsers.

const JPEG_QUALITY = 0.85

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Échec de l'encodage de l'image (toBlob a renvoyé null)."))
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

// Center-cropped square, downscaled to `size`×`size`. Used for avatars.
export async function resizeToSquare(file: File, size = 512): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const edge = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - edge) / 2
    const sy = (bitmap.height - edge) / 2

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Contexte canvas 2D indisponible.')
    ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, size, size)
    return await canvasToJpeg(canvas)
  } finally {
    bitmap.close()
  }
}

// Downscaled to fit within `maxEdge` on its longest side, keeping the aspect
// ratio. Images already small enough are re-encoded as-is. Used for gallery.
export async function resizeMax(file: File, maxEdge = 1080): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const largest = Math.max(bitmap.width, bitmap.height)
    const scale = largest > maxEdge ? maxEdge / largest : 1
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Contexte canvas 2D indisponible.')
    ctx.drawImage(bitmap, 0, 0, w, h)
    return await canvasToJpeg(canvas)
  } finally {
    bitmap.close()
  }
}
