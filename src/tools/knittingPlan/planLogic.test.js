// Tests mit dem in Node eingebauten Test-Runner (node:test), damit keine
// zusätzliche Abhängigkeit nötig ist. Ausführen: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  currentRowFromCounter,
  findSideConflicts,
  fillText,
  isFinished,
  PlanError,
  progress,
  resolvePlan,
  rowAt,
  sectionStartRow,
  sizeValue,
  stepRow,
  totalRows,
  validatePlan,
} from './planLogic.js'
import { sophieScarf } from './examples/sophieScarf.js'
import { vitaScarf } from './examples/vitaScarf.js'

// Kleiner Plan für Sonderfälle; overrides ersetzen Felder auf Planebene.
function miniPlan(overrides = {}) {
  return {
    version: 1,
    title: 'Mini',
    sizes: [{ id: 'one', name: 'Einheitsgröße' }],
    sections: [{ title: 'Teil', blocks: [{ rows: [{ text: 'A' }, { text: 'B' }] }] }],
    ...overrides,
  }
}

const clone = (value) => structuredClone(value)
const paths = (problems) => problems.map((p) => p.path)

describe('Größenwerte und Platzhalter', () => {
  it('liest einfache Werte und Größen-Maps', () => {
    assert.equal(sizeValue(5, 's'), 5)
    assert.equal(sizeValue({ s: 22, l: 27 }, 'l'), 27)
    assert.equal(sizeValue({ s: 22 }, 'x'), undefined)
  })

  it('setzt Platzhalter für die gewählte Größe ein', () => {
    const values = { castOn: { s: 6, l: 8 }, yarn: 'Kaschmir' }
    assert.equal(fillText('{castOn} M in {yarn}', values, 'l'), '8 M in Kaschmir')
    assert.equal(fillText('{unbekannt} M', values, 's'), '{unbekannt} M')
  })
})

describe('validatePlan', () => {
  it('akzeptiert beide echten Beispielpläne', () => {
    assert.deepEqual(validatePlan(sophieScarf), [])
    assert.deepEqual(validatePlan(vitaScarf), [])
  })

  it('meldet fehlende Grundangaben', () => {
    assert.deepEqual(paths(validatePlan(null)), [''])
    const problems = validatePlan({ version: 2, sections: [] })
    assert.deepEqual(paths(problems), ['version', 'title', 'sizes', 'sections'])
  })

  it('meldet doppelte Größen', () => {
    const plan = miniPlan({ sizes: [{ id: 'a', name: 'A' }, { id: 'a', name: 'A2' }] })
    assert.deepEqual(paths(validatePlan(plan)), ['sizes[1].id'])
  })

  it('meldet Größen-Maps mit fehlender oder unbekannter Größe', () => {
    const plan = clone(sophieScarf)
    plan.sections[1].blocks[0].repeat = { s: 22, xl: 30 }
    assert.deepEqual(paths(validatePlan(plan)), [
      'sections[1].blocks[0].repeat.xl',
      'sections[1].blocks[0].repeat',
    ])
  })

  it('meldet ungültige Wiederholungen und Maschenzahlen', () => {
    const plan = clone(sophieScarf)
    plan.sections[1].blocks[0].repeat = { s: 0, l: 2.5 }
    plan.sections[3].blocks[0].rows[0].stitchesAfter = -1
    assert.deepEqual(paths(validatePlan(plan)), [
      'sections[1].blocks[0].repeat.s',
      'sections[1].blocks[0].repeat.l',
      'sections[3].blocks[0].rows[0].stitchesAfter',
    ])
  })

  it('meldet leere Reihentexte und unbekannte Platzhalter', () => {
    const plan = miniPlan()
    plan.sections[0].blocks[0].rows = [{ text: '' }, { text: '{foo} re' }]
    assert.deepEqual(paths(validatePlan(plan)), [
      'sections[0].blocks[0].rows[0].text',
      'sections[0].blocks[0].rows[1].text',
    ])
  })

  it('meldet Hin-/Rückseite bei Runden und unbekannte Einstellungen', () => {
    const plan = miniPlan({ construction: 'round', wsRows: 'manchmal' })
    plan.sections[0].blocks[0].rows[0].side = 'RS'
    assert.deepEqual(paths(validatePlan(plan)), [
      'wsRows',
      'sections[0].blocks[0].rows[0].side',
    ])
  })

  it('meldet Verweise außerhalb der Seite', () => {
    const plan = miniPlan({ ref: { fileId: 1, page: 0 } })
    plan.sections[0].ref = { fileId: 1, page: 1, rect: { x: 0.5, y: 0, w: 0.6, h: 1 } }
    assert.deepEqual(paths(validatePlan(plan)), ['ref.page', 'sections[0].ref.rect'])
  })

  it('meldet Blöcke mit rows und chart gleichzeitig oder ganz ohne Inhalt', () => {
    const plan = miniPlan()
    plan.sections[0].blocks = [
      { rows: [{ text: 'A' }], chart: { from: 1, to: 4 } },
      { chart: { from: 5, to: 2 } },
      { rows: [] },
    ]
    assert.deepEqual(paths(validatePlan(plan)), [
      'sections[0].blocks[0]',
      'sections[0].blocks[1].chart',
      'sections[0].blocks[2]',
    ])
  })
})

describe('resolvePlan', () => {
  it('berechnet die Reihenzahl je Größe (Sophie)', () => {
    // 22·8 Zunahmen + 21·8 Abnahmen + 7 + 7 Spitze
    assert.equal(totalRows(resolvePlan(sophieScarf, 's')), 358)
    // 27·8 + 26·8 + 7 + 7
    assert.equal(totalRows(resolvePlan(sophieScarf, 'l')), 438)
  })

  it('berechnet die Reihenzahl je Größe (Vita, Diagramm)', () => {
    assert.equal(totalRows(resolvePlan(vitaScarf, 'A')), 1 + 13 * 10 + 1)
    assert.equal(totalRows(resolvePlan(vitaScarf, 'C')), 1 + 9 * 10 + 1)
  })

  it('setzt Platzhalter in Notizen ein', () => {
    const resolved = resolvePlan(vitaScarf, 'A')
    assert.equal(resolved.blocks[0].note, '19 M auf Nadel 5,5 mm anschlagen')
    assert.equal(resolved.sizeName, 'A (ca. 140 cm)')
  })

  it('liefert Abschnitte mit Startreihe und Länge', () => {
    const resolved = resolvePlan(sophieScarf, 's')
    assert.deepEqual(
      resolved.sections.map((s) => [s.title, s.startRow, s.rowCount]),
      [
        ['Anschlag', 1, 0],
        ['Zunahmen', 1, 176],
        ['Abnahmen', 177, 175],
        ['Spitze', 352, 7],
      ]
    )
  })

  it('wirft bei unbekannter Größe oder ungültigem Plan', () => {
    assert.throws(() => resolvePlan(sophieScarf, 'xl'), PlanError)
    const broken = miniPlan({ sizes: [] })
    assert.throws(() => resolvePlan(broken, 'one'), (error) => {
      assert.ok(error instanceof PlanError)
      assert.equal(error.problems[0].path, 'sizes')
      return true
    })
  })

  it('ist wieder reines JSON (serialisierbar)', () => {
    const resolved = resolvePlan(sophieScarf, 'l')
    assert.deepEqual(JSON.parse(JSON.stringify(resolved)), resolved)
  })

  it('verändert den Plan nicht', () => {
    const before = clone(sophieScarf)
    resolvePlan(sophieScarf, 's')
    assert.deepEqual(sophieScarf, before)
  })
})

describe('rowAt', () => {
  const small = resolvePlan(sophieScarf, 's')
  const large = resolvePlan(sophieScarf, 'l')

  it('bestimmt Abschnitt, Wiederholung und Reihe aus der globalen Reihe', () => {
    const first = rowAt(small, 1)
    assert.equal(first.sectionTitle, 'Zunahmen')
    assert.equal(first.repeat, 1)
    assert.equal(first.repeatCount, 22)
    assert.equal(first.rowInBlock, 1)
    assert.equal(first.rowsInBlock, 8)
    assert.equal(first.side, 'WS')
    assert.equal(first.label, '1. Reihe')

    const row20 = rowAt(small, 20) // 3. Wiederholung, 4. Reihe
    assert.equal(row20.repeat, 3)
    assert.equal(row20.rowInBlock, 4)
    assert.equal(row20.side, 'RS')
  })

  it('meldet die Maschenzahl am Ende eines Blocks', () => {
    assert.equal(rowAt(small, 175).stitchesAfter, null)
    assert.equal(rowAt(small, 176).stitchesAfter, 28)
    assert.equal(rowAt(large, 216).stitchesAfter, 33)
    // Zahl direkt an der Reihe („= 6 M“)
    assert.equal(rowAt(small, 352).stitchesAfter, 6)
  })

  it('wechselt in den nächsten Abschnitt und Block', () => {
    const row177 = rowAt(small, 177)
    assert.equal(row177.sectionTitle, 'Abnahmen')
    assert.equal(row177.rowInSection, 1)
    assert.equal(row177.repeatCount, 21)

    const row345 = rowAt(small, 345) // erster Block: 176 + 168 = 344
    assert.equal(row345.blockIndex, 1)
    assert.equal(row345.repeatCount, 1)
    assert.equal(row345.rowInSection, 169)

    const last = rowAt(small, 358)
    assert.equal(last.sectionTitle, 'Spitze')
    assert.equal(last.rowInBlock, 7)
    assert.equal(last.stitchesAfter, 0)
  })

  it('erbt den Verweis auf die Anleitung vom Abschnitt', () => {
    assert.deepEqual(rowAt(small, 1).ref, sophieScarf.sections[1].ref)
    assert.equal(rowAt(small, 177).ref.page, 3)
  })

  it('liefert null außerhalb des Plans', () => {
    assert.equal(rowAt(small, 0), null)
    assert.equal(rowAt(small, 359), null)
    assert.equal(rowAt(small, 1.5), null)
  })

  it('nummeriert Diagrammreihen und leitet Hin-/Rückseite ab (Vita)', () => {
    const vita = resolvePlan(vitaScarf, 'C')
    const row2 = rowAt(vita, 2)
    assert.equal(row2.chartRow, 1)
    assert.equal(row2.text, 'Reihe 1 nach Diagramm')
    assert.equal(row2.side, 'RS')
    assert.equal(rowAt(vita, 3).side, 'WS')

    const lastChartRow = rowAt(vita, 91)
    assert.equal(lastChartRow.chartRow, 10)
    assert.equal(lastChartRow.repeat, 9)

    // Abkettreihe: neuer Abschnitt, Wechsel läuft weiter → Hinreihe
    const bindOff = rowAt(vita, 92)
    assert.equal(bindOff.sectionTitle, 'Abketten')
    assert.equal(bindOff.side, 'RS')
    assert.equal(bindOff.ref.page, 3)
  })

  it('setzt den Hin-/Rück-Wechsel bei firstSide im Abschnitt neu', () => {
    const plan = miniPlan()
    plan.sections.push({ title: 'Neu', firstSide: 'RS', blocks: [{ rows: [{ text: 'C' }] }] })
    const resolved = resolvePlan(plan, 'one')
    assert.deepEqual([1, 2, 3].map((n) => rowAt(resolved, n).side), ['RS', 'WS', 'RS'])
  })

  it('ergänzt weggelassene Rückreihen (wsRows: implicit)', () => {
    const plan = miniPlan({ wsRows: 'implicit', wsRowText: 'Rück-R: wie erscheinen' })
    plan.sections[0].blocks[0].repeat = 3
    const resolved = resolvePlan(plan, 'one')
    assert.equal(totalRows(resolved), 2 * 2 * 3)
    assert.deepEqual(
      [1, 2, 3, 4].map((n) => {
        const row = rowAt(resolved, n)
        return [row.text, row.side, row.implicit]
      }),
      [
        ['A', 'RS', false],
        ['Rück-R: wie erscheinen', 'WS', true],
        ['B', 'RS', false],
        ['Rück-R: wie erscheinen', 'WS', true],
      ]
    )
    assert.equal(rowAt(resolved, 5).repeat, 2)
  })

  it('findet keine Seitenkonflikte in den echten Beispielen', () => {
    for (const size of ['s', 'l']) {
      assert.deepEqual(findSideConflicts(resolvePlan(sophieScarf, size)), [])
    }
    assert.deepEqual(findSideConflicts(resolvePlan(vitaScarf, 'A')), [])
  })

  it('findet eine vergessene Reihe über den Seitenwechsel', () => {
    const plan = clone(sophieScarf)
    // 7. Reihe weggelassen: die 8. (Hin-R) rückt auf Platz 7, wo eine Rück-R hingehört
    plan.sections[1].blocks[0].rows.splice(6, 1)
    const conflicts = findSideConflicts(resolvePlan(plan, 's'))
    assert.equal(conflicts[0], 7)
  })

  it('kennt bei Runden keine Hin-/Rückseite', () => {
    const plan = miniPlan({ construction: 'round', wsRows: 'implicit' })
    const resolved = resolvePlan(plan, 'one')
    assert.equal(totalRows(resolved), 2) // implicit gilt nur in Reihen
    assert.equal(rowAt(resolved, 1).side, null)
  })

  it('erlaubt Runden und Reihen gemischt (pro Abschnitt)', () => {
    const plan = miniPlan({ construction: 'round' })
    plan.sections.push({ title: 'Passe', construction: 'flat', firstSide: 'RS', blocks: [{ rows: [{ text: 'C' }] }] })
    const resolved = resolvePlan(plan, 'one')
    assert.equal(rowAt(resolved, 2).side, null)
    assert.equal(rowAt(resolved, 3).side, 'RS')
  })

  it('nimmt Reihentexte je Größe', () => {
    const plan = miniPlan({ sizes: [{ id: 's', name: 'S' }, { id: 'm', name: 'M' }] })
    plan.sections[0].blocks[0].rows = [{ text: { s: '2 re', m: '3 re' } }]
    assert.equal(rowAt(resolvePlan(plan, 'm'), 1).text, '3 re')
  })
})

describe('Navigation und Fortschritt', () => {
  const small = resolvePlan(sophieScarf, 's')

  it('geht vor und zurück und bleibt im Plan', () => {
    assert.equal(stepRow(small, 1, -1), 1)
    assert.equal(stepRow(small, 10, 1), 11)
    assert.equal(stepRow(small, 358, 1), 359)
    assert.equal(stepRow(small, 359, 5), 359)
    assert.equal(isFinished(small, 358), false)
    assert.equal(isFinished(small, 359), true)
  })

  it('springt an den Anfang eines Abschnitts', () => {
    assert.equal(sectionStartRow(small, 2), 177)
    assert.equal(sectionStartRow(small, 99), null)
  })

  it('berechnet den Fortschritt gesamt und im Abschnitt', () => {
    assert.deepEqual(progress(small, 1), {
      done: 0,
      total: 358,
      fraction: 0,
      sectionIndex: 1,
      sectionDone: 0,
      sectionTotal: 176,
    })
    const mid = progress(small, 180)
    assert.equal(mid.done, 179)
    assert.equal(mid.sectionIndex, 2)
    assert.equal(mid.sectionDone, 3)
    const end = progress(small, 359)
    assert.equal(end.fraction, 1)
    assert.equal(end.sectionIndex, null)
  })

  it('leitet die aktuelle Reihe aus dem Reihenzähler ab', () => {
    assert.equal(currentRowFromCounter(0), 1)
    assert.equal(currentRowFromCounter(12), 13)
    // Plan erst bei Zählerstand 4 begonnen
    assert.equal(currentRowFromCounter(12, 4), 9)
    assert.equal(currentRowFromCounter(2, 4), 1)
  })
})
