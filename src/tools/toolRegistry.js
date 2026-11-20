import RowCounter from './rowCounter/RowCounter.jsx'
import StitchCounter from './stitchCounter/StitchCounter.jsx'
import RapportCounter from './rapportCounter/RapportCounter.jsx'
import Notes from './notes/Notes.jsx'
import Pattern from './pattern/Pattern.jsx'
import GuidedKnitting from './guidedKnitting/GuidedKnitting.jsx'

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
  guidedKnitting: {
    key: 'guidedKnitting',
    name: 'Strickplan',
    // Der Plan liegt in der Tabelle knittingPlans; die Projektkarte
    // bekommt keine Kurzzeile, sonst müsste die Liste alle Pläne laden.
    formatStat: () => null,
    component: GuidedKnitting,
    // rowOffset = Zählerstand, bei dem der Plan begonnen hat
    defaults: { value: { planId: null, sizeId: null, rowOffset: 0 } },
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
  notes: {
    key: 'notes',
    name: 'Notizen',
    // Ohne Notizen keine Kurzzeile (statsLine filtert null heraus).
    formatStat: (value) =>
      value.length === 0
        ? null
        : value.length === 1
          ? '1 Notiz'
          : `${value.length} Notizen`,
    component: Notes,
    defaults: { value: [] },
  },
  pattern: {
    key: 'pattern',
    name: 'Anleitung',
    // value verweist nur auf Dateien in der Tabelle patternFiles.
    formatStat: () => null,
    component: Pattern,
    defaults: { value: { fileIds: [] } },
  },
}

// Tool-Instanzen, die ein neues Projekt standardmäßig bekommt.
export function createDefaultTools() {
  return Object.values(toolRegistry).map((tool) => ({
    type: tool.key,
    ...tool.defaults,
  }))
}
