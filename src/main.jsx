import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Vor App laden: hängt die Daten-Migrationen an, bevor Dexie öffnet.
import './data/migrations.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
