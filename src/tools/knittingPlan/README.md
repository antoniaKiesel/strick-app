# Strickplan-Modell

Ein Strickplan beschreibt eine Anleitung so, dass die App zu jedem
Zählerstand die passende Reihe anzeigen kann. Dieser Ordner enthält
das Modell und die reine Logik (`planLogic.js`). Das Tool dazu
(„Strickplan“, geführtes Stricken) liegt in `src/tools/guidedKnitting/`.

Beispiele nach echten Anleitungen: `examples/sophieScarf.js` (ausgeschrieben,
2 Größen) und `examples/vitaScarf.js` (Strickschrift, 3 Größen). Die
Texte darin sind gekürzt und umformuliert, weil die Originale
urheberrechtlich geschützt sind.

## Aufbau

```
Plan
├── version: 1
├── title
├── sizes: [{ id, name }]          mindestens eine (sonst „Einheitsgröße“)
├── values: { name: Größenwert }   für Platzhalter {name} in Texten
├── construction?: 'flat' | 'round'      Standard 'flat'
├── wsRows?: 'listed' | 'implicit'       Standard 'listed'
├── wsRowText?: string                   Text für ergänzte Rückreihen
├── firstSide?: 'RS' | 'WS'              Seite der ersten Reihe, Standard 'RS'
├── ref?: Verweis
└── sections: [Abschnitt]
    ├── title, note?, ref?
    ├── construction? / wsRows? / wsRowText? / firstSide?   überschreiben den Plan
    └── blocks: [Block]
        ├── repeat?: Größenwert (ganze Zahl ≥ 1, Standard 1)
        ├── stitchesAfter?: Größenwert   Maschen nach der letzten Wiederholung
        ├── note?, ref?
        └── rows: [Reihe]  oder  chart: { from, to }   (Diagrammreihen from…to)
            ├── text: Größenwert (String, Platzhalter erlaubt)
            ├── label?          z. B. „8. Reihe“ wie in der Anleitung
            ├── side?: 'RS' | 'WS'
            ├── stitchesAfter?: Größenwert
            └── ref?
```

**Größenwert:** entweder ein einfacher Wert, der für alle Größen gilt,
oder eine Map `{ sizeId: Wert }`, die alle Größen abdeckt. Aus
„22 (27) Mal“ wird `repeat: { s: 22, l: 27 }`.

**Verweis (`ref`):** `{ fileId, page, rect? }`, Stelle in einer
angehängten Anleitung (Tabelle `patternFiles`). `rect = { x, y, w, h }`
relativ zur Seite (0–1). Die spezifischere Angabe gewinnt: Reihe vor
Block vor Abschnitt vor Plan.

**Zählweise:** Eine Plan-Reihe entspricht immer genau einer gestrickten
Reihe oder Runde, so lässt sich der Reihenzähler 1:1 abbilden.
- `wsRows: 'implicit'`: Die Anleitung nennt nur Hinreihen. Beim
  Auflösen wird nach jeder Reihe eine Rückreihe (`wsRowText`) ergänzt.
- Hin/Rück wird, wenn `side` fehlt, aus dem Wechsel abgeleitet. Der
  Wechsel läuft über Abschnittsgrenzen weiter; `firstSide` an einem
  Abschnitt setzt ihn neu.
- In Runden (`construction: 'round'`) gibt es keine Seite.

**Bewusst nicht im Modell:**
- Verweise wie „wie die 1. Reihe“: Solche Reihen werden ausgeschrieben.
  Die Daten sind dadurch redundant, die Logik bleibt aber einfach.
- Offene Wiederholungen („so lange das Garn reicht“): Dann wäre
  globale Reihe → Position nicht mehr eindeutig. Die Zahl wird beim
  Anlegen des Plans festgelegt.

## Funktionen

| Funktion | Zweck |
|---|---|
| `validatePlan(plan)` | Liste `{ path, message }`, leer = gültig |
| `resolvePlan(plan, sizeId)` | Größe einsetzen, Blöcke mit Reihen-Offsets; wirft `PlanError` |
| `totalRows(resolved)` | Gesamtzahl der Reihen |
| `rowAt(resolved, n)` | Abschnitt, Wiederholung, Reihe, Text, Seite, Maschen, Verweis, oder `null` |
| `stepRow(resolved, n, delta)` | nächste/vorige Reihe, begrenzt auf 1 … total + 1 (= fertig) |
| `isFinished(resolved, n)` | hinter der letzten Reihe? |
| `sectionStartRow(resolved, i)` | Sprung an den Anfang eines Abschnitts |
| `progress(resolved, n)` | erledigt/gesamt, auch innerhalb des Abschnitts |
| `findSideConflicts(resolved)` | Reihen, deren Seite nicht zum Wechsel passt (Import-Check) |
| `currentRowFromCounter(count, offset)` | Zählerstand (fertige Reihen) → aktuelle Reihe |

`n` ist immer die 1-basierte Reihe, die gerade gestrickt wird.

## Speicherung

Pläne liegen in der eigenen Dexie-Tabelle `knittingPlans`
(`{ projectId, plan, createdAt, updatedAt }`), damit die Projektliste
schlank bleibt (gleiches Prinzip wie `patternFiles`). Das spätere Tool
speichert im Projekt nur `{ planId, sizeId, rowOffset }`.

## Tests

```
npm test
```

Läuft mit dem in Node eingebauten Test-Runner (`node:test`), ohne
zusätzliche Abhängigkeit.
