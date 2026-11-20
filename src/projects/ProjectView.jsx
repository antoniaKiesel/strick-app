import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateToolValue } from '../data/db.js'
import { toolRegistry } from '../tools/toolRegistry.js'
import ToolErrorBoundary from '../components/ToolErrorBoundary.jsx'

function ProjectView({ projectId, onBack }) {
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId])

  if (!project) return null

  return (
    <div className="screen">
      <div className="nav-bar">
        <button type="button" className="nav-back" onClick={onBack}>
          ‹ Projekte
        </button>
        <span />
      </div>

      <h1 className="large-title">{project.name}</h1>

      {project.tools.map((tool, index) => {
        const definition = toolRegistry[tool.type]
        if (!definition) return null
        const ToolComponent = definition.component
        return (
          <ToolErrorBoundary
            key={`${tool.type}-${index}`}
            label={definition.name}
          >
            <ToolComponent
              projectId={project.id}
              label={definition.name}
              value={tool.value}
              onChange={(value) => updateToolValue(project.id, index, value)}
            />
          </ToolErrorBoundary>
        )
      })}
    </div>
  )
}

export default ProjectView
