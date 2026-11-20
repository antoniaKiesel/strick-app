import { Component } from 'react'

// Fehlergrenze pro Tool: Wirft ein Tool beim Rendern (z. B. weil
// useLiveQuery einen Abfragefehler durchreicht), fällt nur dieses Tool
// aus statt der ganzen App. Error Boundaries gibt es in React nur als
// Klassenkomponente.
class ToolErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(`Tool „${this.props.label}“ ist abgestürzt:`, error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <section>
        <p className="section-header">{this.props.label}</p>
        <div className="cell-group">
          <div className="cell-row tool-error">
            <span>Dieses Tool konnte nicht geladen werden.</span>
            <button
              type="button"
              className="tool-error-retry"
              onClick={() => this.setState({ error: null })}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </section>
    )
  }
}

export default ToolErrorBoundary
