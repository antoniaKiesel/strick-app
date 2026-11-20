// Ausführen: npm test
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { addMissingTools } from './toolMigration.js'

const defaults = [
  { type: 'rowCounter', value: 0 },
  { type: 'guidedKnitting', value: { planId: null } },
  { type: 'stitchCounter', value: 0 },
  { type: 'notes', value: [] },
]

describe('addMissingTools', () => {
  it('setzt ein neues Tool hinter seinen Vorgänger aus der Registry', () => {
    const tools = [
      { type: 'rowCounter', value: 7 },
      { type: 'stitchCounter', value: 3 },
      { type: 'notes', value: ['x'] },
    ]
    addMissingTools(tools, defaults)
    assert.deepEqual(
      tools.map((t) => t.type),
      ['rowCounter', 'guidedKnitting', 'stitchCounter', 'notes']
    )
    assert.equal(tools[0].value, 7) // vorhandene Werte bleiben
  })

  it('stellt ein Tool ohne vorhandenen Vorgänger an den Anfang', () => {
    const tools = [{ type: 'notes', value: [] }]
    addMissingTools(tools, defaults)
    assert.deepEqual(
      tools.map((t) => t.type),
      ['rowCounter', 'guidedKnitting', 'stitchCounter', 'notes']
    )
  })

  it('ändert nichts, wenn alles da ist, und teilt keine Default-Objekte', () => {
    const tools = []
    addMissingTools(tools, defaults)
    assert.notEqual(tools[1].value, defaults[1].value)
    const before = JSON.stringify(tools)
    addMissingTools(tools, defaults)
    assert.equal(JSON.stringify(tools), before)
  })
})
