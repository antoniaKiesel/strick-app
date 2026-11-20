// Ausführen: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FILE_PLACEHOLDER,
  attachFile,
  checkImportedPlan,
  extractPlanJson,
  repairPrompt,
} from './planImport.js'
import { sophieScarf } from './examples/sophieScarf.js'
import { vitaScarf } from './examples/vitaScarf.js'

describe('extractPlanJson', () => {
  it('liest den json-Codeblock', () => {
    const text = 'Hier ist der Plan:\n```json\n{"title":"A"}\n```\nViel Spaß!'
    assert.deepEqual(extractPlanJson(text).plan, { title: 'A' })
  })

  it('nimmt sonst das erste {...}', () => {
    assert.deepEqual(extractPlanJson('Plan: {"a": {"b": 1}} Ende').plan, { a: { b: 1 } })
  })

  it('meldet fehlendes oder kaputtes JSON', () => {
    assert.equal(extractPlanJson('Kein Plan').problems.length, 1)
    assert.equal(extractPlanJson('```json\n{ kaputt\n```').problems.length, 1)
  })
})

describe('attachFile', () => {
  it('setzt die Datei-id in allen Verweisen und lässt das Original unverändert', () => {
    const plan = {
      ref: { fileId: FILE_PLACEHOLDER, page: 1 },
      sections: [
        {
          ref: { fileId: FILE_PLACEHOLDER, page: 2 },
          blocks: [{ ref: { fileId: 0, page: 3 }, rows: [{ text: 'x', ref: { fileId: 0, page: 4 } }] }],
        },
      ],
    }
    const fixed = attachFile(plan, 42)
    assert.equal(fixed.ref.fileId, 42)
    assert.equal(fixed.sections[0].ref.fileId, 42)
    assert.equal(fixed.sections[0].blocks[0].ref.fileId, 42)
    assert.equal(fixed.sections[0].blocks[0].rows[0].ref.fileId, 42)
    assert.equal(plan.ref.fileId, FILE_PLACEHOLDER)
  })

  it('übersteht unvollständige Pläne', () => {
    assert.deepEqual(attachFile({ sections: [null, { blocks: 'x' }] }, 1).sections[0], null)
  })
})

describe('checkImportedPlan', () => {
  it('akzeptiert die Beispielpläne ohne Warnungen', () => {
    for (const plan of [sophieScarf, vitaScarf]) {
      assert.deepEqual(checkImportedPlan(plan), { problems: [], warnings: [] })
    }
  })

  it('meldet Modellfehler', () => {
    const { problems } = checkImportedPlan({ version: 1, title: '', sizes: [] })
    assert.ok(problems.length >= 2)
  })

  it('warnt bei Hin/Rück, das nicht zum Wechsel passt', () => {
    const plan = {
      version: 1,
      title: 'T',
      sizes: [{ id: 'a', name: 'A' }],
      sections: [
        {
          title: 'S',
          blocks: [{ rows: [{ text: '1', side: 'RS' }, { text: '2', side: 'RS' }] }],
        },
      ],
    }
    const { problems, warnings } = checkImportedPlan(plan)
    assert.equal(problems.length, 0)
    assert.match(warnings[0], /Größe A: .*\(ab Reihe 2\)/)
  })
})

describe('repairPrompt', () => {
  it('listet die Probleme mit Pfad', () => {
    const text = repairPrompt([{ path: 'sizes', message: 'Mindestens eine Größe nötig' }])
    assert.match(text, /- sizes: Mindestens eine Größe nötig/)
  })
})
