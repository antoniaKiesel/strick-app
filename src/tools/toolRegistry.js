import RowCounter from './rowCounter/RowCounter.jsx'

// Zentrale Liste aller Tools. Ein neues Tool braucht nur einen eigenen
// Ordner unter src/tools/ und einen Eintrag hier – sonst nichts.
export const toolRegistry = {
  rowCounter: {
    key: 'rowCounter',
    name: 'Reihenzähler',
    component: RowCounter,
    defaults: { value: 0 },
  },
}

// Tool-Instanzen, die ein neues Projekt standardmäßig bekommt.
export function createDefaultTools() {
  return Object.values(toolRegistry).map((tool) => ({
    type: tool.key,
    ...tool.defaults,
  }))
}
