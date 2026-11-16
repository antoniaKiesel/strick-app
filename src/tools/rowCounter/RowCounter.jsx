import './RowCounter.css'

// Vertrag für alle Tools: label (Anzeigename aus der Registry),
// value (aktueller Wert aus der DB) und onChange (Wert oder Updater-Funktion).
function RowCounter({ label, value, onChange }) {
  return (
    <section>
      <p className="section-header">{label}</p>
      <div className="cell-group">
        <div className="cell-row row-counter">
          <button
            type="button"
            className="row-button minus"
            onClick={() => onChange((current) => Math.max(0, current - 1))}
            aria-label="Eine Reihe zurück"
          >
            −
          </button>
          <p className="row-counter-value">{value}</p>
          <button
            type="button"
            className="row-button plus"
            onClick={() => onChange((current) => current + 1)}
            aria-label="Eine Reihe weiter"
          >
            +
          </button>
        </div>
      </div>
      <p className="section-footer">Eine Reihe fertig? Tippe auf +.</p>
    </section>
  )
}

export default RowCounter
