import { useRef, useState } from 'react'
import './RapportCounter.css'

// Gleicher Vertrag wie bei den anderen Tools: label, value, onChange.
// Besonderheit: value ist hier ein Objekt { current, total }, weil zum
// Rapportzähler auch die einstellbare Gesamtzahl der Wiederholungen gehört.
// updateToolValue schreibt das Objekt als Ganzes – Updater-Funktionen laufen
// weiterhin atomar in der Dexie-Transaktion.

const MIN_TOTAL = 1
const MAX_TOTAL = 99
// Bis zu dieser Gesamtzahl zeigen wir Segmente wie im Figma,
// darüber einen durchgehenden Balken.
const MAX_SEGMENTS = 12

function RapportCounter({ label, value, onChange }) {
  // Einstellungen (Gesamtzahl, Rückgängig, Auf 0) sind wie im Figma
  // hinter „Bearbeiten“ verstaut, damit die Karte kompakt bleibt.
  const [editing, setEditing] = useState(false)

  // Undo wie beim Maschenzähler: alte Werte auf einem Stapel im Speicher,
  // gepflegt innerhalb des Updaters (dort ist der Wert garantiert aktuell).
  // Hier liegen ganze { current, total }-Schnappschüsse auf dem Stapel,
  // Rückgängig holt also auch eine Änderung der Gesamtzahl zurück.
  const historyRef = useRef([])
  const [historySize, setHistorySize] = useState(0)

  function change(mutate) {
    onChange((current) => {
      const next = mutate(current)
      if (next === current) return current
      historyRef.current.push(current)
      setHistorySize(historyRef.current.length)
      return next
    })
  }

  function step(delta) {
    change((v) => {
      const next = Math.min(v.total, Math.max(0, v.current + delta))
      return next === v.current ? v : { ...v, current: next }
    })
  }

  function changeTotal(delta) {
    change((v) => {
      const total = Math.min(MAX_TOTAL, Math.max(MIN_TOTAL, v.total + delta))
      if (total === v.total) return v
      // Schrumpft die Gesamtzahl unter den Stand, wird der Stand mitgekappt.
      return { total, current: Math.min(v.current, total) }
    })
  }

  // Neues Muster anfangen: Stand auf 0, Gesamtzahl bleibt. Landet auf dem
  // Undo-Stapel, ein versehentlicher Tipp lässt sich also zurückholen.
  function reset() {
    change((v) => (v.current === 0 ? v : { ...v, current: 0 }))
  }

  function undo() {
    onChange((current) => {
      if (historyRef.current.length === 0) return current
      const previous = historyRef.current.pop()
      setHistorySize(historyRef.current.length)
      return previous
    })
  }

  const done = value.current >= value.total
  const progress = Math.min(100, (value.current / value.total) * 100)

  // Ein Tipp auf die Karte (außerhalb der Buttons) klappt die Einstellungen
  // ebenfalls auf bzw. zu. Der „Bearbeiten“-Button im Kopf bleibt als
  // sichtbarer Einstieg und für Tastatur/Screenreader.
  function handleCardClick(event) {
    if (event.target.closest('button')) return
    setEditing((wasEditing) => !wasEditing)
  }

  return (
    <section className="rapport-tool">
      <div className="rapport-header">
        <h2 className="rapport-heading">{label}</h2>
        <button
          type="button"
          className="rapport-edit-toggle"
          onClick={() => setEditing((wasEditing) => !wasEditing)}
        >
          {editing ? 'Fertig' : 'Bearbeiten'}
        </button>
      </div>

      <div className="tool-card rapport-card" onClick={handleCardClick}>
        <div className="rapport-counter">
          <button
            type="button"
            className="rapport-button minus"
            onClick={() => step(-1)}
            aria-label="Einen Rapport zurück"
          >
            −
          </button>
          <p className="rapport-value">
            Rapport {value.current} / {value.total}
          </p>
          <button
            type="button"
            className="rapport-button plus"
            onClick={() => step(1)}
            aria-label="Einen Rapport weiter"
          >
            +
          </button>
        </div>

        {value.total <= MAX_SEGMENTS ? (
          <div
            className="rapport-segments"
            role="progressbar"
            aria-label="Fortschritt der Musterwiederholungen"
            aria-valuemin={0}
            aria-valuemax={value.total}
            aria-valuenow={value.current}
          >
            {Array.from({ length: value.total }, (_, index) => (
              <span
                key={index}
                className={
                  index < value.current
                    ? 'rapport-segment filled'
                    : 'rapport-segment'
                }
              />
            ))}
          </div>
        ) : (
          <div
            className="rapport-progress"
            role="progressbar"
            aria-label="Fortschritt der Musterwiederholungen"
            aria-valuemin={0}
            aria-valuemax={value.total}
            aria-valuenow={value.current}
          >
            <div
              className="rapport-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {editing && (
          <div className="rapport-edit-row">
            <div className="rapport-total">
              <span className="rapport-total-label">Gesamt</span>
              <button
                type="button"
                className="rapport-total-button"
                onClick={() => changeTotal(-1)}
                disabled={value.total <= MIN_TOTAL}
                aria-label="Gesamtzahl der Rapporte verringern"
              >
                −
              </button>
              <span className="rapport-total-value">{value.total}</span>
              <button
                type="button"
                className="rapport-total-button"
                onClick={() => changeTotal(1)}
                disabled={value.total >= MAX_TOTAL}
                aria-label="Gesamtzahl der Rapporte erhöhen"
              >
                +
              </button>
            </div>
            <div className="rapport-edit-actions">
              <button
                type="button"
                className="rapport-undo"
                onClick={undo}
                disabled={historySize === 0}
              >
                ↺ Rückgängig
              </button>
              <button
                type="button"
                className="rapport-reset"
                onClick={reset}
                disabled={value.current === 0}
                aria-label="Rapportzähler auf null setzen"
              >
                Auf 0
              </button>
            </div>
          </div>
        )}

        {done && <p className="rapport-hint">Alle Rapporte geschafft! 🎉</p>}
      </div>
    </section>
  )
}

export default RapportCounter
