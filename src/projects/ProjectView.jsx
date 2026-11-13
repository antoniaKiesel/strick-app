import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateToolValue } from '../data/db.js'
import { toolRegistry } from '../tools/toolRegistry.js'
import YarnIcon from '../components/YarnIcon.jsx'

function ProjectView({ projectId, onBack }) {
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId])

  if (!project) return null

  return (
    <div className="screen">
      <button type="button" className="back-link" onClick={onBack}>
        ‹ Projekte
      </button>

      <header className="app-header">
        <h1>{project.name}</h1>
        <YarnIcon size={48} />
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
