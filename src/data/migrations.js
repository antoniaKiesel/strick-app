import { db } from './db.js'
import { createDefaultTools } from '../tools/toolRegistry.js'
import { addMissingTools } from './toolMigration.js'

// Daten-Migrationen: Bestehende Projekte bekommen neu eingeführte
// Standard-Tools nachgetragen. Upgrades laufen nur einmal pro Version,
// deshalb braucht jedes neue Standard-Tool eine eigene Version (das
// Schema dazu steht in db.js).
//
// Dieses Modul muss vor dem ersten Datenbankzugriff geladen sein
// (main.jsx importiert es vor App.jsx): Dexie öffnet die Datenbank beim
// ersten Zugriff, danach lassen sich keine Upgrades mehr anhängen.
const backfillTools = (transaction) =>
  transaction
    .table('projects')
    .toCollection()
    .modify((project) => {
      addMissingTools(project.tools, createDefaultTools())
    })

db.version(2).upgrade(backfillTools) // Maschenzähler
db.version(3).upgrade(backfillTools) // Rapportzähler
db.version(4).upgrade(backfillTools) // Notizen
db.version(5).upgrade(backfillTools) // Anleitung
db.version(7).upgrade(backfillTools) // Geführt stricken (Strickplan)
