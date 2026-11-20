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

// Gleiche Nachrüst-Logik für den Rapportzähler: Projekte aus Version 2
// bekommen das neue Standard-Tool angehängt (Upgrades laufen nur einmal
// pro Version, deshalb reicht die Version-2-Migration dafür nicht aus).
db.version(3).upgrade((transaction) =>
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

// Und noch einmal für die Notizen: Projekte aus Version 3 bekommen das
// neue Standard-Tool (leeres Notizen-Array) angehängt.
db.version(4).upgrade((transaction) =>
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

// Anleitungen (PDF/Foto) liegen als Blob in einer eigenen Tabelle, damit
// das Projekt-Objekt klein bleibt – die Projektliste lädt alle Projekte
// komplett, die Dateien aber nur, wenn sie wirklich angezeigt werden.
// Das Tool im Projekt speichert nur die ids als Verweis ({ fileIds }).
// Datensatz: { id, projectId, name, mimeType, size, blob, createdAt }
// projectId ist indiziert, damit beim Löschen eines Projekts alle seine
// Dateien mit weg können. Spätere Erweiterungen (Strickplan, KI-Import)
// verweisen über die id auf denselben Datensatz.
db.version(5)
  .stores({
    patternFiles: '++id, projectId',
  })
  .upgrade((transaction) =>
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

// Projekt und zugehörige Anleitungsdateien in einer Transaktion löschen.
export function deleteProject(id) {
  return db.transaction('rw', db.projects, db.patternFiles, async () => {
    await db.patternFiles.where('projectId').equals(id).delete()
    await db.projects.delete(id)
  })
}

// file ist ein File aus <input type="file"> (also ein Blob). Gibt die
// neue id zurück.
export function addPatternFile(projectId, file) {
  return db.patternFiles.add({
    projectId,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    blob: file,
    createdAt: new Date(),
  })
}

export function deletePatternFile(id) {
  return db.patternFiles.delete(id)
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
