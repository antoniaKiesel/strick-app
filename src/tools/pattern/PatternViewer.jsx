import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db.js'
import ZoomPane from './ZoomPane.jsx'
import PdfPages from './PdfPages.jsx'
import { isPdf } from './patternFile.js'
import './PatternViewer.css'

// Vollbild-Ansicht einer Anleitung (PDF oder Foto) mit Pinch-Zoom.
// Bewusst eigenständig gehalten (nur fileId + onClose), damit spätere
// Tools – etwa die Zeilen-Karte beim geführten Stricken – dieselbe
// Ansicht öffnen können.
function PatternViewer({ fileId, onClose }) {
  // undefined = lädt noch, null = nicht (mehr) vorhanden
  const file = useLiveQuery(
    async () => (await db.patternFiles.get(fileId)) ?? null,
    [fileId]
  )
  const [pageCount, setPageCount] = useState(null)

  // Hintergrundseite währenddessen nicht mitscrollen lassen.
  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  const subtitle = !file
    ? ''
    : isPdf(file)
      ? pageCount === null
        ? 'PDF'
        : pageCount === 1
          ? '1 Seite'
          : `${pageCount} Seiten`
      : 'Foto'

  // Portal an <body>: die Ansicht liegt so außerhalb der Tool-Karte und
  // erbt nicht deren Farbton (tone-*-Variablen).
  return createPortal(
    <div
      className="pattern-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Anleitung"
    >
      <div className="viewer-bar">
        <span />
        <div className="viewer-title">
          <span className="viewer-name">{file?.name ?? 'Anleitung'}</span>
          <span className="viewer-subtitle">{subtitle}</span>
        </div>
        <button type="button" className="viewer-done" onClick={onClose}>
          Fertig
        </button>
      </div>

      {file === null ? (
        <p className="viewer-message">Die Anleitung wurde nicht gefunden.</p>
      ) : (
        file && (
          <ZoomPane className="viewer-pane">
            {({ zoom, baseWidth }) =>
              isPdf(file) ? (
                <PdfPages
                  blob={file.blob}
                  cssWidth={Math.round(baseWidth * zoom)}
                  onPageCount={setPageCount}
                />
              ) : (
                <PatternImage blob={file.blob} name={file.name} />
              )
            }
          </ZoomPane>
        )
      )}
    </div>,
    document.body
  )
}

function PatternImage({ blob, name }) {
  const imageRef = useRef(null)

  // Object-URL direkt am DOM setzen und beim Wechsel/Schließen wieder
  // freigeben, sonst bleibt das Foto bis zum Neuladen im Speicher.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob)
    imageRef.current.src = objectUrl
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  return <img ref={imageRef} className="viewer-image" alt={name} />
}

export default PatternViewer
