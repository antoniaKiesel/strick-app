import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, createProject, deleteProject } from '../data/db.js'
import { createDefaultTools, toolRegistry } from '../tools/toolRegistry.js'
import YarnIcon from '../components/YarnIcon.jsx'
import './ProjectList.css'

// Kurzzeile wie „10 Reihen · 64 Maschen“ aus den Tool-Werten des Projekts.
function statsLine(project) {
  return project.tools
    .map((tool) => {
      const definition = toolRegistry[tool.type]
      if (!definition) return null
      if (definition.formatStat) return definition.formatStat(tool.value)
      if (definition.statLabel) return `${tool.value} ${definition.statLabel}`
      return null
    })
    .filter(Boolean)
    .join(' · ')
}

function ProjectList({ onOpen }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  // iOS-typischer Bearbeiten-Modus: rote Löschkreise statt Menü pro Zeile.
  const [editMode, setEditMode] = useState(false)
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').toArray(), [])

  async function handleCreate(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const id = await createProject(trimmed, createDefaultTools())
    setName('')
    setCreating(false)
    onOpen(id)
  }

  function cancelCreate() {
    setCreating(false)
    setName('')
  }

  function handleDelete(project) {
    if (window.confirm(`Projekt „${project.name}“ wirklich löschen?`)) {
      deleteProject(project.id)
    }
  }

  const count = projects?.length ?? 0

  return (
    <div className="screen">
      <div className="nav-bar">
        <span />
        {count > 0 && (
          <button
            type="button"
            className="nav-action"
            onClick={() => setEditMode((was) => !was)}
          >
            {editMode ? 'Fertig' : 'Bearbeiten'}
          </button>
        )}
      </div>

      <header className="title-row">
        <h1 className="large-title">Meine Projekte</h1>
        <YarnIcon size={40} />
      </header>

      <section>
        <p className="section-header">
          <span>In Arbeit</span>
          <span>{count === 1 ? '1 Projekt' : `${count} Projekte`}</span>
        </p>
        <div className="cell-group">
          {projects?.map((project) => (
            <div key={project.id} className="cell-row project-row">
              {editMode && (
                <button
                  type="button"
                  className="row-delete"
                  onClick={() => handleDelete(project)}
                  aria-label={`Projekt ${project.name} löschen`}
                >
                  −
                </button>
              )}
              <button
                type="button"
                className="project-row-main"
                onClick={() => onOpen(project.id)}
              >
                <span className="project-name">{project.name}</span>
                <span className="project-stats">{statsLine(project)}</span>
              </button>
              <span className="chevron" aria-hidden="true">
                ›
              </span>
            </div>
          ))}

          {creating ? (
            <form className="cell-row new-project-row" onSubmit={handleCreate}>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name des Projekts"
                aria-label="Name des neuen Projekts"
              />
              <button
                type="button"
                className="nav-action"
                onClick={cancelCreate}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="nav-action new-project-save"
                disabled={!name.trim()}
              >
                Fertig
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="cell-row add-row"
              onClick={() => {
                setCreating(true)
                setEditMode(false)
              }}
            >
              <span className="add-icon" aria-hidden="true">
                ＋
              </span>
              Neues Projekt
            </button>
          )}
        </div>
        {count === 0 && (
          <p className="section-footer">
            Noch keine Projekte – tippe auf „Neues Projekt“.
          </p>
        )}
      </section>
    </div>
  )
}

export default ProjectList
