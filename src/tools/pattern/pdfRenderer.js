// Dünne Hülle um pdf.js, damit der Rest der App nichts über die
// Bibliothek wissen muss. Dieses Modul wird nur per import() geladen –
// pdf.js (~1,7 MB inkl. Worker) landet damit nicht im Start-Bundle.
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

// Obergrenze für Canvas-Pixel pro Seite. iOS-Safari begrenzt sowohl die
// Größe einzelner Canvas (~16,7 Mio. Pixel) als auch den gesamten
// Canvas-Speicher; bei mehreren gleichzeitig sichtbaren Seiten und Zoom
// bleiben wir mit 5 Mio. Pixel (≈ 20 MB) pro Seite sicher darunter.
const MAX_CANVAS_PIXELS = 5_000_000

export async function openPdf(blob) {
  const data = new Uint8Array(await blob.arrayBuffer())
  return getDocument({ data }).promise
}

// Seitenformate (in PDF-Punkten) aller Seiten – reicht für Platzhalter
// mit korrektem Seitenverhältnis, bevor eine Seite gerendert ist.
export async function getPageSizes(pdf) {
  const sizes = []
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number)
    const { width, height } = page.getViewport({ scale: 1 })
    sizes.push({ width, height })
  }
  return sizes
}

// Rendert eine Seite in eine neue Canvas mit der gewünschten Breite in
// Gerätepixeln. Rückgabe: { promise, cancel }; promise liefert die Canvas.
export function renderPage(pdf, pageNumber, pixelWidth) {
  let task = null
  let cancelled = false

  const promise = (async () => {
    const page = await pdf.getPage(pageNumber)
    const base = page.getViewport({ scale: 1 })
    let scale = pixelWidth / base.width
    const pixels = base.width * base.height * scale * scale
    if (pixels > MAX_CANVAS_PIXELS) {
      scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels)
    }
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    if (cancelled) throw new Error('cancelled')
    task = page.render({ canvas, viewport })
    await task.promise
    return canvas
  })()

  return {
    promise,
    cancel() {
      cancelled = true
      task?.cancel()
    },
  }
}
