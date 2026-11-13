import './RowCounter.css'

// Vertrag für alle Tools: label (Anzeigename aus der Registry),
// value (aktueller Wert aus der DB) und onChange (schreibt den neuen Wert).
function RowCounter({ label, value, onChange }) {
  return (
    <section className="tool-card">
      <h3>{label}</h3>
      <p className="row-counter-value">{value}</p>
      <div className="row-counter-buttons">
        <button
          type="button"
          className="big-button"
          onClick={() => onChange((current) => Math.max(0, current - 1))}
          aria-label="Eine Reihe zurück"
        >
          −
        </button>
        <button
          type="button"
          className="big-button primary"
          onClick={() => onChange((current) => current + 1)}
          aria-label="Eine Reihe weiter"
        >
          +
        </button>
      </div>
    </section>
  )
}

export default RowCounter
