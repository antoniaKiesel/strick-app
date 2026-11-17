import { useRef, useState } from 'react'
import './StitchCounter.css'

// Gleicher Vertrag wie beim Reihenzähler: label, value, onChange.
// Zusätzlich gibt es Rückgängig: vor jeder Änderung merken wir uns den
// alten Wert auf einem Stapel. Der Stapel lebt nur im Speicher (nicht in
// Dexie) – der Zählerstand selbst bleibt persistent, die Undo-Historie
// gilt pro Sitzung.
function StitchCounter({ label, value, onChange }) {
  // Ref statt State für den Stapel: push/pop passieren innerhalb der
  // Dexie-Transaktion (im Updater), dort lesen wir den echten aktuellen
  // Wert statt eines evtl. veralteten Props. historySize spiegelt die
  // Länge als State, damit der Rückgängig-Button korrekt (de)aktiviert.
  const historyRef = useRef([])
  const [historySize, setHistorySize] = useState(0)

  function applyChange(step) {
    onChange((current) => {
      const next = Math.max(0, current + step)
      if (next !== current) {
        historyRef.current.push(current)
        setHistorySize(historyRef.current.length)
      }
      return next
    })
  }

  // Reset landet ebenfalls auf dem Stapel: ein versehentlicher Tipp
  // lässt sich also mit Rückgängig zurückholen.
  function reset() {
    onChange((current) => {
      if (current === 0) return current
      historyRef.current.push(current)
      setHistorySize(historyRef.current.length)
      return 0
    })
  }

  function undo() {
    onChange((current) => {
      if (historyRef.current.length === 0) return current
      const previous = historyRef.current.pop()
      setHistorySize(historyRef.current.length)
      return previous
    })
  }

  return (
    <section>
      <p className="section-header">{label}</p>
      <div className="cell-group tone-mint">
        <div className="cell-row stitch-main">
          <button
            type="button"
            className="stitch-button minus"
            onClick={() => applyChange(-1)}
            aria-label="Eine Masche zurück"
          >
            −
          </button>
          <p className="stitch-counter-value">{value}</p>
          <button
            type="button"
            className="stitch-button plus"
            onClick={() => applyChange(1)}
            aria-label="Eine Masche weiter"
          >
            +
          </button>
        </div>
        <div className="cell-row stitch-actions">
        <button
          type="button"
          className="stitch-undo"
          onClick={undo}
          disabled={historySize === 0}
        >
          ↺ Rückgängig
        </button>
        <button
          type="button"
          className="stitch-reset"
          onClick={reset}
          disabled={value === 0}
          aria-label="Maschenzähler auf null setzen"
        >
          Auf 0
        </button>
        </div>
      </div>
    </section>
  )
}

export default StitchCounter
