// Ausführen: npm test (node:test, siehe planLogic.test.js)
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  currentRowFromCounter,
  resolvePlan,
  rowAt,
  sectionStartRow,
} from '../knittingPlan/planLogic.js'
import { vitaScarf } from '../knittingPlan/examples/vitaScarf.js'
import { sophieScarf } from '../knittingPlan/examples/sophieScarf.js'
import {
  blockNote,
  notesBeforeRow,
  parsePlanJson,
  pickRefFile,
  rowOffsetForRow,
  sideLabel,
} from './guidedLogic.js'

describe('rowOffsetForRow', () => {
  it('ist die Umkehrung von currentRowFromCounter', () => {
    for (const counter of [0, 5, 37]) {
      for (const target of [1, 4, 120]) {
        const offset = rowOffsetForRow(counter, target)
        assert.equal(currentRowFromCounter(counter, offset), target)
      }
    }
  })

  it('springt an einen Abschnittsanfang, ohne den Zähler zu ändern', () => {
    const resolved = resolvePlan(vitaScarf, 'C')
    const start = sectionStartRow(resolved, 2) // Abketten
    const offset = rowOffsetForRow(12, start)
    const position = rowAt(resolved, currentRowFromCounter(12, offset))
    assert.equal(position.sectionTitle, 'Abketten')
  })
})

describe('notesBeforeRow', () => {
  it('zeigt den Anschlag vor der ersten Reihe, mit Größenwert', () => {
    const resolved = resolvePlan(vitaScarf, 'A')
    assert.deepEqual(notesBeforeRow(resolved, 1), [
      { sectionTitle: 'Anschlag', note: '19 M auf Nadel 5,5 mm anschlagen' },
    ])
    assert.deepEqual(notesBeforeRow(resolved, 2), [])
  })
})

describe('blockNote', () => {
  it('liefert die Notiz des Rapport-Blocks', () => {
    const resolved = resolvePlan(vitaScarf, 'C')
    const position = rowAt(resolved, 1 + 18 + 1) // erste Rapportreihe
    assert.equal(position.chartRow, 19)
    assert.match(blockNote(resolved, position), /Rapport/)
  })
})

describe('sideLabel', () => {
  it('übersetzt RS/WS, Runden haben keine Seite', () => {
    assert.equal(sideLabel('RS'), 'Hinreihe')
    assert.equal(sideLabel('WS'), 'Rückreihe')
    assert.equal(sideLabel(null), null)
  })
})

describe('parsePlanJson', () => {
  it('akzeptiert einen gültigen Plan', () => {
    const { plan, problems } = parsePlanJson(JSON.stringify(sophieScarf))
    assert.equal(problems, undefined)
    assert.equal(plan.title, 'Sophie Scarf')
  })

  it('meldet kaputtes JSON', () => {
    const { problems } = parsePlanJson('{ nein')
    assert.equal(problems.length, 1)
  })

  it('meldet Modellfehler mit Pfad', () => {
    const { problems } = parsePlanJson(JSON.stringify({ version: 1 }))
    assert.ok(problems.some((p) => p.path === 'title'))
  })
})

describe('pickRefFile', () => {
  const ref = { fileId: 2, page: 4 }
  it('nimmt die genannte Datei, wenn sie zum Projekt gehört', () => {
    assert.equal(pickRefFile(ref, [5, 2]), 2)
  })
  it('fällt sonst auf die erste Anleitung des Projekts zurück', () => {
    assert.equal(pickRefFile(ref, [7, 8]), 7)
  })
  it('ohne Verweis oder ohne Dateien: null', () => {
    assert.equal(pickRefFile(null, [7]), null)
    assert.equal(pickRefFile(ref, []), null)
  })
})
