import Dexie from 'dexie'

export const db = new Dexie('strick-app')

// tools ist ein eingebettetes Array pro Projekt: [{ type, value }, …]
// Nur Felder, nach denen gesucht/sortiert wird, stehen im Index-String.
db.version(1).stores({
  projects: '++id, name, createdAt',
})

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
