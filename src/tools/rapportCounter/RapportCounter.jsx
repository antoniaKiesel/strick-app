import { useRef, useState } from 'react'
import {
  MIN_TOTAL,
  MAX_TOTAL,
  stepRapport,
  changeTotal,
  resetRapport,
  isDone,
} from './rapportLogic.js'
import './RapportCounter.css'

// Gleicher Vertrag wie bei den anderen Tools: label, value, onChange.
// Besonderheit: value ist ein Objekt { current, total }. Die fachlichen
// Regeln liegen in rapportLogic.js; hier steht nur UI und Undo-Verwaltung.

// Bis zu dieser Gesamtzahl zeigen wir Segmente, darüber einen Balken.
const MAX_SEGMENTS = 12

function RapportCounter({ label, value, onChange }) {
  // Einstellungen (Gesamtzahl, Rückgängig, Auf 0) sind hinter
  // „Bearbeiten“ verstaut; ein Tipp auf die Zelle klappt sie ebenfalls um.
  const [editing, setEditing] = useState(false)

  // Undo: { current, total }-Schnappschüsse auf einem Stapel im Speicher,
  // gepflegt innerhalb des Updaters (dort ist der Wert garantiert aktuell).
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

  function undo() {
    onChange((current) => {
      if (historyRef.current.length === 0) return current
      const previous = historyRef.current.pop()
      setHistorySize(historyRef.current.length)
      return previous
    })
  }

  // Tipp auf die Zelle (aber nicht auf einen Button) klappt die
  // Einstellungen auf und zu.
  function handleCellTap(event) {
    if (event.target.closest('button')) return
    setEditing((was) => !was)
  }

  return (
    <section>
      <p className="section-header">
        <span>{label}</span>
        <button
          type="button"
          className="rapport-edit-toggle"
          onClick={() => setEditing((was) => !was)}
        >
          {editing ? 'Fertig' : 'Bearbeiten'}
        </button>
      </p>

      <div className="cell-group tone-peach rapport-group" onClick={handleCellTap}>
        <div className="cell-row rapport-main">
          <button
            type="button"
            className="rapport-button minus"
            onClick={() => change((v) => stepRapport(v, -1))}
            aria-label="Einen Rapport zurück"
          >
            −
          </button>
          <div className="rapport-center">
            <p className="rapport-value">
              Rapport {value.current} / {value.total}
            </p>
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
                  style={{
                    width: `${Math.min(100, (value.current / value.total) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            className="rapport-button plus"
            onClick={() => change((v) => stepRapport(v, 1))}
            aria-label="Einen Rapport weiter"
          >
            +
          </button>
        </div>

        {editing && (
          <div className="cell-row rapport-edit-row">
            <span className="rapport-total-label">Gesamt</span>
            <span className="rapport-total-value">{value.total}</span>
            <div className="ios-stepper">
              <button
                type="button"
                onClick={() => change((v) => changeTotal(v, -1))}
                disabled={value.total <= MIN_TOTAL}
                aria-label="Gesamtzahl der Rapporte verringern"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => change((v) => changeTotal(v, 1))}
                disabled={value.total >= MAX_TOTAL}
                aria-label="Gesamtzahl der Rapporte erhöhen"
              >
                +
              </button>
            </div>
            <span className="rapport-edit-spacer" />
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
              onClick={() => change(resetRapport)}
              disabled={value.current === 0}
              aria-label="Rapportzähler auf null setzen"
            >
              Auf 0
            </button>
          </div>
        )}
      </div>

      {isDone(value) && (
        <p className="section-footer">Alle Rapporte geschafft! 🎉</p>
      )}
    </section>
  )
}

export default RapportCounter
