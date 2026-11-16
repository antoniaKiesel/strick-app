import RowCounter from './rowCounter/RowCounter.jsx'
import StitchCounter from './stitchCounter/StitchCounter.jsx'
import RapportCounter from './rapportCounter/RapportCounter.jsx'

// Zentrale Liste aller Tools. Ein neues Tool braucht nur einen eigenen
// Ordner unter src/tools/ und einen Eintrag hier – sonst nichts.
export const toolRegistry = {
  rowCounter: {
    key: 'rowCounter',
    name: 'Reihe',
    statLabel: 'Reihen', // für die Kurzzeile auf der Projektkarte
    component: RowCounter,
    defaults: { value: 0 },
  },
  stitchCounter: {
    key: 'stitchCounter',
    name: 'Maschen',
    statLabel: 'Maschen',
    component: StitchCounter,
    defaults: { value: 0 },
  },
  rapportCounter: {
    key: 'rapportCounter',
    name: 'Muster wiederholen',
    // value ist hier ein Objekt – statt statLabel formatiert formatStat
    // die Kurzzeile auf der Projektkarte selbst.
    formatStat: (value) => `Rapport ${value.current}/${value.total}`,
    component: RapportCounter,
    defaults: { value: { current: 0, total: 6 } },
  },
}

// Tool-Instanzen, die ein neues Projekt standardmäßig bekommt.
export function createDefaultTools() {
  return Object.values(toolRegistry).map((tool) => ({
    type: tool.key,
    ...tool.defaults,
  }))
}
