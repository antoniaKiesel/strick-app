import Dexie from 'dexie'
import { createDefaultTools } from '../tools/toolRegistry.js'

export const db = new Dexie('strick-app')

// tools ist ein eingebettetes Array pro Projekt: [{ type, value }, …]
// Nur Felder, nach denen gesucht/sortiert wird, stehen im Index-String.
db.version(1).stores({
  projects: '++id, name, createdAt',
})

// Bestehende Projekte wurden vor dem Maschenzähler angelegt und haben ihn
// noch nicht im tools-Array. Die Migration trägt alle Standard-Tools nach,
// die einem Projekt fehlen (das Schema selbst bleibt unverändert).
db.version(2).upgrade((transaction) =>
  transaction
    .table('projects')
    .toCollection()
    .modify((project) => {
      const existingTypes = new Set(project.tools.map((tool) => tool.type))
      for (const defaultTool of createDefaultTools()) {
        if (!existingTypes.has(defaultTool.type)) {
          project.tools.push(defaultTool)
        }
      }
    })
)

export function createProject(name, tools) {
  return db.projects.add({
    name,
    createdAt: new Date(),
    tools,
  })
}

export function deleteProject(id) {
  return db.projects.delete(id)
}

// update ist ein Wert oder eine Funktion (alterWert) => neuerWert.
// Die Funktionsform läuft innerhalb der Transaktion und ist damit atomar:
// schnelle aufeinanderfolgende Klicks können sich so nicht überschreiben.
export function updateToolValue(projectId, toolIndex, update) {
  return db.projects
    .where('id')
    .equals(projectId)
    .modify((project) => {
      const tool = project.tools[toolIndex]
      tool.value = typeof update === 'function' ? update(tool.value) : update
    })
}
