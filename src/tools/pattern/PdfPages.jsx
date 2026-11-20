import { useEffect, useRef, useState } from 'react'
import HighlightBox from './HighlightBox.jsx'

// Alle Seiten einer PDF untereinander. Platzhalter mit korrektem
// Seitenverhältnis gibt es sofort für alle Seiten; gerendert werden nur
// Seiten in Bildschirmnähe (IntersectionObserver), weit entfernte geben
// ihre Canvas wieder frei – sonst sprengen lange Anleitungen auf dem
// iPhone das Canvas-Speicherlimit.

function PdfPage({ pdf, renderer, pageNumber, size, cssWidth, highlight }) {
  const holderRef = useRef(null)
  const [nearby, setNearby] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setNearby(entry.isIntersecting),
      { rootMargin: '100% 0px' }
    )
    observer.observe(holderRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const holder = holderRef.current
    if (!nearby || cssWidth === 0) {
      releaseCanvas(holder)
      return
    }
    const pixelWidth = cssWidth * (window.devicePixelRatio || 1)
    const job = renderer.renderPage(pdf, pageNumber, pixelWidth)
    // Neue Canvas erst nach dem Rendern einsetzen: beim Nachschärfen nach
    // dem Zoomen bleibt so die alte (unscharfe) Version bis dahin stehen.
    job.promise.then(
      (canvas) => {
        releaseCanvas(holder)
        holder.appendChild(canvas)
      },
      () => {} // abgebrochen (Seite verlassen oder neuer Zoom)
    )
    return () => job.cancel()
  }, [nearby, cssWidth, pdf, renderer, pageNumber])

  // Beim Verlassen der Ansicht Speicher sofort freigeben.
  useEffect(() => {
    const holder = holderRef.current
    return () => releaseCanvas(holder)
  }, [])

  // Markierte Seite einmal beim Öffnen in die Mitte holen. Die
  // Platzhalter haben schon ihre Höhe, die Position stimmt also auch,
  // bevor die Seiten gerendert sind.
  useEffect(() => {
    if (!highlight) return
    const target =
      holderRef.current.querySelector('.viewer-highlight') ?? holderRef.current
    target.scrollIntoView({ block: highlight.rect ? 'center' : 'start' })
    // Nur beim Öffnen, nicht bei jedem Zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={holderRef}
      className="pdf-page"
      style={{ aspectRatio: `${size.width} / ${size.height}` }}
      aria-label={`Seite ${pageNumber}`}
    >
      {highlight?.rect && <HighlightBox rect={highlight.rect} />}
    </div>
  )
}

// iOS gibt Canvas-Speicher zuverlässig erst frei, wenn die Größe auf 0
// gesetzt wird – entfernen aus dem DOM allein reicht nicht.
function releaseCanvas(holder) {
  for (const canvas of holder.querySelectorAll('canvas')) {
    canvas.width = 0
    canvas.height = 0
    canvas.remove()
  }
}

function PdfPages({ blob, cssWidth, onPageCount, highlight }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let loadingTask = null
    ;(async () => {
      try {
        const renderer = await import('./pdfRenderer.js')
        loadingTask = await renderer.openPdf(blob)
        if (cancelled) return loadingTask.destroy()
        const pdf = await loadingTask.promise
        const sizes = await renderer.getPageSizes(pdf)
        if (cancelled) return
        setState({ status: 'ready', pdf, renderer, sizes })
        onPageCount?.(sizes.length)
      } catch (error) {
        if (cancelled) return // Abbruch beim Schließen ist kein Fehler
        console.error(error)
        setState({ status: 'error' })
      }
    })()
    // Aufräumen darf nie werfen: ein Fehler hier reißt den ganzen
    // Komponentenbaum mit (vorher: weiße Seite nach „Fertig“).
    return () => {
      cancelled = true
      loadingTask?.destroy().catch(() => {})
    }
    // onPageCount bewusst nicht als Abhängigkeit: nur pro Datei neu laden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob])

  if (state.status === 'loading') {
    return <p className="viewer-message">PDF wird geladen …</p>
  }
  if (state.status === 'error') {
    return (
      <p className="viewer-message">Die PDF konnte nicht geöffnet werden.</p>
    )
  }

  return (
    <div className="pdf-pages">
      {state.sizes.map((size, index) => (
        <PdfPage
          key={index}
          pdf={state.pdf}
          renderer={state.renderer}
          pageNumber={index + 1}
          size={size}
          cssWidth={cssWidth}
          highlight={highlight?.page === index + 1 ? highlight : null}
        />
      ))}
    </div>
  )
}

export default PdfPages
