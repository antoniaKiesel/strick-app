import { useState } from 'react'
import './Notes.css'

// Gleicher Vertrag wie bei den anderen Tools: label, value, onChange.
// value ist ein Array von Notiz-Texten (Strings), erstmal nur ans Projekt
// geknüpft. Gespeichert wird bei jedem Tastendruck über onChange; die
// Textarea zeigt aber einen lokalen Entwurf an, weil der Umweg über
// Dexie + liveQuery asynchron ist und ein direkt an value gebundenes
// Eingabefeld bei schnellem Tippen Zeichen verschlucken würde.

function Notes({ label, value, onChange }) {
  // null oder { index, draft } – es wird immer höchstens eine Notiz bearbeitet.
  const [editing, setEditing] = useState(null)

  function startEditing(index) {
    setEditing({ index, draft: value[index] })
  }

  function addNote() {
    onChange((notes) => [...notes, ''])
    setEditing({ index: value.length, draft: '' })
  }

  function updateDraft(text) {
    const { index } = editing
    setEditing({ index, draft: text })
    onChange((notes) => notes.map((note, i) => (i === index ? text : note)))
  }

  function removeNote() {
    const { index } = editing
    onChange((notes) => notes.filter((_, i) => i !== index))
    setEditing(null)
  }

  // Beim Verlassen des Felds: leere Notizen verschwinden wieder.
  function finishEditing() {
    if (editing.draft.trim()) {
      setEditing(null)
    } else {
      removeNote()
    }
  }

  // pointerdown-preventDefault hält den Fokus in der Textarea, damit vor dem
  // Klick kein blur feuert – sonst liefe finishEditing doppelt bzw. zuerst.
  function keepFocus(event) {
    event.preventDefault()
  }

  return (
    <section className="notes-tool">
      <div className="notes-header">
        <h2 className="notes-title">{label}</h2>
        <button type="button" className="notes-add" onClick={addNote}>
          + Hinzufügen
        </button>
      </div>
      <div className="notes-card tone-butter">
        {value.length === 0 && (
          <p className="notes-empty">
            Noch keine Notizen – tippe oben auf „+ Hinzufügen“.
          </p>
        )}
        <ul className="notes-list">
          {value.map((note, index) =>
            editing?.index === index ? (
              <li key={index} className="notes-item">
                <textarea
                  className="notes-textarea"
                  autoFocus
                  rows={3}
                  value={editing.draft}
                  onChange={(event) => updateDraft(event.target.value)}
                  onBlur={finishEditing}
                  placeholder="Was willst du dir merken?"
                  aria-label="Notiz bearbeiten"
                />
                <div className="notes-edit-actions">
                  <button
                    type="button"
                    className="notes-delete"
                    onPointerDown={keepFocus}
                    onClick={removeNote}
                  >
                    Löschen
                  </button>
                  <button
                    type="button"
                    className="notes-done"
                    onPointerDown={keepFocus}
                    onClick={finishEditing}
                  >
                    Fertig
                  </button>
                </div>
              </li>
            ) : (
              <li key={index} className="notes-item">
                <button
                  type="button"
                  className="notes-text"
                  onClick={() => startEditing(index)}
                  aria-label={`Notiz bearbeiten: ${note}`}
                >
                  {note}
                </button>
              </li>
            )
          )}
        </ul>
      </div>
    </section>
  )
}

export default Notes
