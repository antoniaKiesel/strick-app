import Dexie from 'dexie'

// Nur Schema und Datenzugriff. Die Upgrade-Funktionen, die Standard-Tools
// in bestehende Projekte nachtragen, stehen in migrations.js: Sie brauchen
// die Tool-Registry, und die Tools importieren wiederum db.js – ein
// Import hier würde einen Zyklus bilden (bricht u. a. Vite-HMR).
export const db = new Dexie('strick-app')

// tools ist ein eingebettetes Array pro Projekt: [{ type, value }, …]
// Nur Felder, nach denen gesucht/sortiert wird, stehen im Index-String.
db.version(1).stores({
  projects: '++id, name, createdAt',
})

// Version 2–4: nur Daten-Migrationen (Maschenzähler, Rapportzähler,
// Notizen nachrüsten), Schema unverändert.
db.version(2).stores({})
db.version(3).stores({})
db.version(4).stores({})

// Anleitungen (PDF/Foto) liegen als Blob in einer eigenen Tabelle, damit
// das Projekt-Objekt klein bleibt – die Projektliste lädt alle Projekte
// komplett, die Dateien aber nur, wenn sie wirklich angezeigt werden.
// Das Tool im Projekt speichert nur die ids als Verweis ({ fileIds }).
// Datensatz: { id, projectId, name, mimeType, size, blob, createdAt }
// projectId ist indiziert, damit beim Löschen eines Projekts alle seine
// Dateien mit weg können. Spätere Erweiterungen (Strickplan, KI-Import)
// verweisen über die id auf denselben Datensatz.
db.version(5).stores({
  patternFiles: '++id, projectId',
})

// Strickpläne (Modell siehe src/tools/knittingPlan/README.md) liegen
// aus demselben Grund in einer eigenen Tabelle: Ein ausgeschriebener
// Plan kann groß werden, die Projektliste soll ihn nicht mitladen.
// Datensatz: { id, projectId, plan, createdAt, updatedAt }
db.version(6).stores({
  knittingPlans: '++id, projectId',
})

// Version 7: Tool „Geführt stricken“ nachrüsten (Daten-Migration).
db.version(7).stores({})

// Geräte-Einstellungen als Schlüssel/Wert, z. B. der API-Key für den
// KI-Import. Bleibt nur in diesem Browser (IndexedDB), wird nie
// synchronisiert oder exportiert. Datensatz: { key, value }
db.version(8).stores({
  settings: 'key',
})

export function createProject(name, tools) {
  return db.projects.add({
    name,
    createdAt: new Date(),
    tools,
  })
}

// Projekt samt Anleitungsdateien und Strickplänen in einer Transaktion
// löschen.
export function deleteProject(id) {
  return db.transaction('rw', db.projects, db.patternFiles, db.knittingPlans, async () => {
    await db.patternFiles.where('projectId').equals(id).delete()
    await db.knittingPlans.where('projectId').equals(id).delete()
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

// plan ist ein gültiger Strickplan (validatePlan). Gibt die neue id zurück.
export function addKnittingPlan(projectId, plan) {
  const now = new Date()
  return db.knittingPlans.add({ projectId, plan, createdAt: now, updatedAt: now })
}

export function deleteKnittingPlan(id) {
  return db.knittingPlans.delete(id)
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

export async function getSetting(key) {
  return (await db.settings.get(key))?.value ?? null
}

// value null löscht die Einstellung.
export function setSetting(key, value) {
  return value == null ? db.settings.delete(key) : db.settings.put({ key, value })
}
