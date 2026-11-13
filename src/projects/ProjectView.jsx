import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateToolValue } from '../data/db.js'
import { toolRegistry } from '../tools/toolRegistry.js'

function ProjectView({ projectId, onBack }) {
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId])

  if (!project) return null

  return (
    <div className="screen">
      <header className="screen-header">
        <button type="button" className="big-button back" onClick={onBack}>
          ← Zurück
        </button>
        <h1>{project.name}</h1>
      </header>

      {project.tools.map((tool, index) => {
        const definition = toolRegistry[tool.type]
        if (!definition) return null
        const ToolComponent = definition.component
        return (
          <ToolComponent
            key={`${tool.type}-${index}`}
            label={definition.name}
            value={tool.value}
            onChange={(value) => updateToolValue(project.id, index, value)}
          />
        )
      })}
    </div>
  )
}

export default ProjectView
