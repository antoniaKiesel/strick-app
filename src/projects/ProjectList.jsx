import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, createProject, deleteProject } from '../data/db.js'
import { createDefaultTools, toolRegistry } from '../tools/toolRegistry.js'
import YarnIcon from '../components/YarnIcon.jsx'

const CARD_COLORS = ['lilac', 'peach', 'mint']

// Kurzzeile wie „10 Reihen“ aus den Tool-Werten des Projekts.
function statsLine(project) {
  return project.tools
    .map((tool) => {
      const definition = toolRegistry[tool.type]
      if (!definition?.statLabel) return null
      return `${tool.value} ${definition.statLabel}`
    })
    .filter(Boolean)
    .join(' · ')
}

function ProjectList({ onOpen }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
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

  function handleDelete(project) {
    if (window.confirm(`Projekt „${project.name}“ wirklich löschen?`)) {
      deleteProject(project.id)
    }
  }

  return (
    <div className="screen">
      <header className="app-header">
        <div>
          <p className="eyebrow">Dein Strickbegleiter</p>
          <h1>Meine Projekte</h1>
          <p className="tagline">Ein Faden. Viele Möglichkeiten.</p>
        </div>
        <YarnIcon />
      </header>

      <div className="section-row">
        <h2>In Arbeit</h2>
        <span>
          {projects?.length === 1 ? '1 Projekt' : `${projects?.length ?? 0} Projekte`}
        </span>
      </div>

      {projects?.length === 0 && (
        <p className="empty-hint">Noch keine Projekte – leg unten dein erstes an.</p>
      )}

      <ul className="project-list">
        {projects?.map((project, index) => (
          <li
            key={project.id}
            className={`project-card ${CARD_COLORS[index % CARD_COLORS.length]}`}
          >
            <div className="project-card-top">
              <button
                type="button"
                className="project-open"
                onClick={() => onOpen(project.id)}
              >
                {project.name}
              </button>
              <button
                type="button"
                className="card-menu"
                onClick={() => handleDelete(project)}
                aria-label={`Projekt ${project.name} löschen`}
              >
                •••
              </button>
            </div>
            <button
              type="button"
              className="project-card-bottom"
              onClick={() => onOpen(project.id)}
            >
              <span>{statsLine(project)}</span>
              <span className="chevron" aria-hidden="true">
                ›
              </span>
            </button>
          </li>
        ))}
      </ul>

      {creating ? (
        <form className="new-project" onSubmit={handleCreate}>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Wie heißt dein Projekt?"
            aria-label="Name des neuen Projekts"
          />
          <button type="submit" className="pill-button" disabled={!name.trim()}>
            Anlegen
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setCreating(false)
              setName('')
            }}
          >
            Abbrechen
          </button>
        </form>
      ) : (
        <button type="button" className="pill-button" onClick={() => setCreating(true)}>
          + Neues Projekt
        </button>
      )}

      <p className="footer-hint">Dein nächstes Lieblingsstück beginnt hier.</p>
    </div>
  )
}

export default ProjectList
