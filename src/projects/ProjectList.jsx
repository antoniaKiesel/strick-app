import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, createProject, deleteProject } from '../data/db.js'
import { createDefaultTools } from '../tools/toolRegistry.js'

function ProjectList({ onOpen }) {
  const [name, setName] = useState('')
  const projects = useLiveQuery(() => db.projects.orderBy('createdAt').toArray(), [])

  async function handleCreate(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const id = await createProject(trimmed, createDefaultTools())
    setName('')
    onOpen(id)
  }

  function handleDelete(project) {
    if (window.confirm(`Projekt „${project.name}“ wirklich löschen?`)) {
      deleteProject(project.id)
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Meine Projekte</h1>
      </header>

      <form className="new-project" onSubmit={handleCreate}>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Neues Projekt, z. B. „Socken“"
          aria-label="Name des neuen Projekts"
        />
        <button type="submit" className="big-button primary" disabled={!name.trim()}>
          Anlegen
        </button>
      </form>

      {projects?.length === 0 && (
        <p className="empty-hint">Noch keine Projekte – leg oben dein erstes an.</p>
      )}

      <ul className="project-list">
        {projects?.map((project) => (
          <li key={project.id}>
            <button
              type="button"
              className="big-button project-open"
              onClick={() => onOpen(project.id)}
            >
              {project.name}
            </button>
            <button
              type="button"
              className="big-button danger"
              onClick={() => handleDelete(project)}
              aria-label={`Projekt ${project.name} löschen`}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProjectList
