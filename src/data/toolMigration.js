// Reine Funktion für die Daten-Migrationen in migrations.js (ohne Dexie,
// damit sie sich mit node:test prüfen lässt).
//
// Trägt alle Standard-Tools nach, die in tools fehlen. Jedes fehlende
// Tool kommt hinter das letzte vorhandene Tool, das in der Registry vor
// ihm steht – so landet z. B. der Strickplan direkt hinter dem
// Reihenzähler statt ganz unten. Verändert tools direkt (wie es
// Collection.modify erwartet) und gibt es zurück.
export function addMissingTools(tools, defaults) {
  const existingTypes = new Set(tools.map((tool) => tool.type))
  defaults.forEach((defaultTool, registryIndex) => {
    if (existingTypes.has(defaultTool.type)) return
    const predecessors = new Set(
      defaults.slice(0, registryIndex).map((tool) => tool.type)
    )
    const after = tools.findLastIndex((tool) => predecessors.has(tool.type))
    tools.splice(after + 1, 0, structuredClone(defaultTool))
    existingTypes.add(defaultTool.type)
  })
  return tools
}
