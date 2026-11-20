// Reine Logik des Tools „Geführt stricken“ (ohne React/Dexie), ergänzt
// planLogic.js um das, was nur dieses Tool braucht: Zählerstand ↔
// Plan-Reihe, Hinweise vor einer Reihe, JSON-Import und die Wahl der
// Anleitungsdatei für einen Verweis.

import { validatePlan } from '../knittingPlan/planLogic.js'

// Gegenstück zu currentRowFromCounter: Welcher rowOffset sorgt dafür,
// dass beim aktuellen Zählerstand genau targetRow die aktuelle Reihe
// ist? Damit springt das Tool im Plan, ohne den Reihenzähler anzufassen.
// Der Offset darf negativ werden (Plan „vor“ dem Zähler begonnen).
export function rowOffsetForRow(counterValue, targetRow) {
  return counterValue - (targetRow - 1)
}

// Anweisungen ohne eigene Reihe (z. B. „19 M anschlagen“), die vor
// rowNumber zu erledigen sind: Notiz-Blöcke mit 0 Reihen, die genau an
// dieser Stelle im Plan stehen.
export function notesBeforeRow(resolved, rowNumber) {
  return resolved.blocks
    .filter(
      (block) =>
        block.rowCount === 0 && block.startRow === rowNumber && block.note
    )
    .map((block) => ({
      sectionTitle: resolved.sections[block.sectionIndex].title,
      note: block.note,
    }))
}

// Notiz des Blocks, zu dem die Position (aus rowAt) gehört.
export function blockNote(resolved, position) {
  const block = resolved.blocks.find(
    (b) =>
      b.sectionIndex === position.sectionIndex &&
      b.blockIndex === position.blockIndex
  )
  return block?.note ?? null
}

export function sideLabel(side) {
  if (side === 'RS') return 'Hinreihe'
  if (side === 'WS') return 'Rückreihe'
  return null
}

// JSON-Text → { plan } oder { problems: [{ path, message }] }.
export function parsePlanJson(text) {
  let plan
  try {
    plan = JSON.parse(text)
  } catch {
    return { problems: [{ path: '', message: 'Keine gültige JSON-Datei' }] }
  }
  const problems = validatePlan(plan)
  return problems.length > 0 ? { problems } : { plan }
}

// Verweise im Plan nennen eine fileId aus patternFiles. Bei
// Beispielplänen oder importierten Plänen passt die id meist nicht zu
// den Dateien dieses Projekts – dann wird die erste angehängte Anleitung
// des Projekts genommen. null = keine Anleitung vorhanden.
export function pickRefFile(ref, projectFileIds) {
  if (!ref || projectFileIds.length === 0) return null
  return projectFileIds.includes(ref.fileId) ? ref.fileId : projectFileIds[0]
}
