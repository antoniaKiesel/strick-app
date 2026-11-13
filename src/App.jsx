import { useState } from 'react'
import ProjectList from './projects/ProjectList.jsx'
import ProjectView from './projects/ProjectView.jsx'

function App() {
  const [openProjectId, setOpenProjectId] = useState(null)

  if (openProjectId !== null) {
    return (
      <ProjectView
        projectId={openProjectId}
        onBack={() => setOpenProjectId(null)}
      />
    )
  }

  return <ProjectList onOpen={setOpenProjectId} />
}

export default App
