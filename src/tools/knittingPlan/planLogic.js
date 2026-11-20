// Fachliche Logik des Strickplans, bewusst ohne React/Dexie: reine
// Funktionen über ein serialisierbares Plan-Objekt (Aufbau siehe
// README.md im selben Ordner). Bei einer SwiftUI-Portierung werden
// Plan, Abschnitt, Block und Reihe zu Codable-structs und diese
// Funktionen zu Methoden darauf.
//
// Zählweise: Reihennummern sind 1-basiert und meinen die Reihe, die
// gerade gestrickt wird. Eine Plan-Reihe entspricht immer genau einer
// tatsächlich gestrickten Reihe/Runde – auch wenn die Anleitung
// Rückreihen weglässt (wsRows: 'implicit' ergänzt sie beim Auflösen).

export const PLAN_VERSION = 1
export const CONSTRUCTIONS = ['flat', 'round']
export const WS_ROW_MODES = ['listed', 'implicit']
export const SIDES = ['RS', 'WS']
export const DEFAULT_WS_ROW_TEXT = 'Rückreihe: Maschen stricken, wie sie erscheinen'

// ---------------------------------------------------------------------
// Größenabhängige Werte
// ---------------------------------------------------------------------

// Ein Größenwert ist entweder ein einfacher Wert (gilt für alle Größen)
// oder eine Map { sizeId: Wert }.
export function isSizeMap(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function sizeValue(value, sizeId) {
  return isSizeMap(value) ? value[sizeId] : value
}

const PLACEHOLDER = /\{(\w+)\}/g

// Ersetzt {name} durch plan.values[name] für die gewählte Größe.
// Unbekannte Platzhalter bleiben stehen (validatePlan meldet sie).
export function fillText(text, values, sizeId) {
  if (typeof text !== 'string') return text
  return text.replace(PLACEHOLDER, (match, name) => {
    const value = sizeValue(values?.[name], sizeId)
    return value === undefined ? match : String(value)
  })
}

// ---------------------------------------------------------------------
// Validierung
// ---------------------------------------------------------------------

// Liefert alle Probleme als Liste { path, message }; leer = gültig.
// Pfade sind JS-artig ('sections[1].blocks[0].repeat'), damit eine
// spätere Korrektur-UI (KI-Import) die Stelle anzeigen kann.
export function validatePlan(plan) {
  const problems = []
  const report = (path, message) => problems.push({ path, message })

  if (!isSizeMap(plan)) {
    report('', 'Plan muss ein Objekt sein')
    return problems
  }
  if (plan.version !== PLAN_VERSION) {
    report('version', `Unbekannte Version (erwartet ${PLAN_VERSION})`)
  }
  if (typeof plan.title !== 'string' || plan.title.trim() === '') {
    report('title', 'Titel fehlt')
  }

  const sizeIds = validateSizes(plan.sizes, report)
  const values = isSizeMap(plan.values) ? plan.values : {}
  if (plan.values !== undefined && !isSizeMap(plan.values)) {
    report('values', 'values muss ein Objekt sein')
  }
  for (const [name, value] of Object.entries(values)) {
    checkSizeValue(value, `values.${name}`, sizeIds, report, isTextOrNumber)
  }

  const ctx = { sizeIds, values, report }
  checkSettings(plan, '', report)
  checkRef(plan.ref, 'ref', report)

  if (!Array.isArray(plan.sections) || plan.sections.length === 0) {
    report('sections', 'Mindestens ein Abschnitt nötig')
    return problems
  }
  plan.sections.forEach((section, i) =>
    checkSection(section, `sections[${i}]`, plan, ctx)
  )
  return problems
}

function validateSizes(sizes, report) {
  const ids = []
  if (!Array.isArray(sizes) || sizes.length === 0) {
    report('sizes', 'Mindestens eine Größe nötig')
    return ids
  }
  sizes.forEach((size, i) => {
    if (!isSizeMap(size) || typeof size.id !== 'string' || size.id === '') {
      report(`sizes[${i}].id`, 'Größe braucht eine id')
      return
    }
    if (ids.includes(size.id)) {
      report(`sizes[${i}].id`, `Größe „${size.id}“ doppelt`)
    }
    if (typeof size.name !== 'string' || size.name.trim() === '') {
      report(`sizes[${i}].name`, 'Größe braucht einen Namen')
    }
    ids.push(size.id)
  })
  return ids
}

function checkSettings(owner, path, report) {
  const at = (key) => (path ? `${path}.${key}` : key)
  if (owner.construction !== undefined && !CONSTRUCTIONS.includes(owner.construction)) {
    report(at('construction'), `Erlaubt: ${CONSTRUCTIONS.join(', ')}`)
  }
  if (owner.wsRows !== undefined && !WS_ROW_MODES.includes(owner.wsRows)) {
    report(at('wsRows'), `Erlaubt: ${WS_ROW_MODES.join(', ')}`)
  }
  if (owner.firstSide !== undefined && !SIDES.includes(owner.firstSide)) {
    report(at('firstSide'), `Erlaubt: ${SIDES.join(', ')}`)
  }
}

function checkSection(section, path, plan, ctx) {
  const { report } = ctx
  if (!isSizeMap(section)) {
    report(path, 'Abschnitt muss ein Objekt sein')
    return
  }
  if (typeof section.title !== 'string' || section.title.trim() === '') {
    report(`${path}.title`, 'Abschnitt braucht einen Titel')
  }
  checkSettings(section, path, report)
  checkRef(section.ref, `${path}.ref`, report)
  checkText(section.note, `${path}.note`, ctx, true)

  const construction = section.construction ?? plan.construction ?? 'flat'
  if (!Array.isArray(section.blocks)) {
    report(`${path}.blocks`, 'blocks muss eine Liste sein')
    return
  }
  section.blocks.forEach((block, i) =>
    checkBlock(block, `${path}.blocks[${i}]`, construction, ctx)
  )
}

function checkBlock(block, path, construction, ctx) {
  const { report, sizeIds } = ctx
  if (!isSizeMap(block)) {
    report(path, 'Block muss ein Objekt sein')
    return
  }
  checkRef(block.ref, `${path}.ref`, report)
  checkText(block.note, `${path}.note`, ctx, true)
  if (block.repeat !== undefined) {
    checkSizeValue(block.repeat, `${path}.repeat`, sizeIds, report, isPositiveInt)
  }
  if (block.stitchesAfter !== undefined) {
    checkSizeValue(block.stitchesAfter, `${path}.stitchesAfter`, sizeIds, report, isCount)
  }

  const hasRows = block.rows !== undefined
  const hasChart = block.chart !== undefined
  if (hasRows && hasChart) {
    report(path, 'Block hat entweder rows oder chart, nicht beides')
  }
  if (hasChart) {
    const { from, to } = isSizeMap(block.chart) ? block.chart : {}
    if (!isPositiveInt(from) || !isPositiveInt(to) || to < from) {
      report(`${path}.chart`, 'chart braucht ganze Zahlen from ≤ to (ab 1)')
    }
  } else if (hasRows) {
    if (!Array.isArray(block.rows)) {
      report(`${path}.rows`, 'rows muss eine Liste sein')
    } else {
      block.rows.forEach((row, i) =>
        checkRow(row, `${path}.rows[${i}]`, construction, ctx)
      )
    }
  }
  if (!hasChart && (!Array.isArray(block.rows) || block.rows.length === 0) && block.note === undefined) {
    report(path, 'Block ohne Reihen braucht wenigstens eine Notiz')
  }
}

function checkRow(row, path, construction, ctx) {
  const { report, sizeIds } = ctx
  if (!isSizeMap(row)) {
    report(path, 'Reihe muss ein Objekt sein')
    return
  }
  checkText(row.text, `${path}.text`, ctx, false)
  if (row.side !== undefined) {
    if (construction === 'round') {
      report(`${path}.side`, 'Runden haben keine Hin-/Rückseite')
    } else if (!SIDES.includes(row.side)) {
      report(`${path}.side`, `Erlaubt: ${SIDES.join(', ')}`)
    }
  }
  if (row.stitchesAfter !== undefined) {
    checkSizeValue(row.stitchesAfter, `${path}.stitchesAfter`, sizeIds, report, isCount)
  }
  checkRef(row.ref, `${path}.ref`, report)
}

function checkText(text, path, ctx, optional) {
  if (text === undefined && optional) return
  const ok = checkSizeValue(text, path, ctx.sizeIds, ctx.report, isNonEmptyString)
  if (!ok) return
  const texts = isSizeMap(text) ? Object.values(text) : [text]
  for (const t of texts) {
    for (const [, name] of t.matchAll(PLACEHOLDER)) {
      if (!(name in ctx.values)) {
        ctx.report(path, `Platzhalter {${name}} ist in values nicht definiert`)
      }
    }
  }
}

// Prüft einen Größenwert: einfacher Wert oder Map, die genau die
// bekannten Größen abdeckt. Gibt true zurück, wenn alles passt.
function checkSizeValue(value, path, sizeIds, report, isValid) {
  if (!isSizeMap(value)) {
    if (isValid(value)) return true
    report(path, 'Ungültiger Wert')
    return false
  }
  let ok = true
  for (const key of Object.keys(value)) {
    if (!sizeIds.includes(key)) {
      report(`${path}.${key}`, `Unbekannte Größe „${key}“`)
      ok = false
    } else if (!isValid(value[key])) {
      report(`${path}.${key}`, 'Ungültiger Wert')
      ok = false
    }
  }
  for (const id of sizeIds) {
    if (!(id in value)) {
      report(path, `Wert für Größe „${id}“ fehlt`)
      ok = false
    }
  }
  return ok
}

// Verweis auf eine Stelle in einer angehängten Anleitung (Tabelle
// patternFiles). rect ist relativ zur Seite (0–1), damit es von der
// Render-Auflösung unabhängig ist.
function checkRef(ref, path, report) {
  if (ref === undefined) return
  if (!isSizeMap(ref)) {
    report(path, 'ref muss ein Objekt sein')
    return
  }
  if (!isPositiveInt(ref.fileId)) report(`${path}.fileId`, 'fileId fehlt')
  if (!isPositiveInt(ref.page)) report(`${path}.page`, 'Seite muss ≥ 1 sein')
  if (ref.rect !== undefined) {
    const { x, y, w, h } = isSizeMap(ref.rect) ? ref.rect : {}
    const inUnit = [x, y, w, h].every((n) => typeof n === 'number' && n >= 0 && n <= 1)
    if (!inUnit || w === 0 || h === 0 || x + w > 1 || y + h > 1) {
      report(`${path}.rect`, 'rect muss innerhalb der Seite liegen (Werte 0–1)')
    }
  }
}

const isPositiveInt = (n) => Number.isInteger(n) && n >= 1
const isCount = (n) => Number.isInteger(n) && n >= 0
const isNonEmptyString = (s) => typeof s === 'string' && s.trim() !== ''
const isTextOrNumber = (v) => typeof v === 'string' || typeof v === 'number'

// ---------------------------------------------------------------------
// Auflösen für eine Größe
// ---------------------------------------------------------------------

export class PlanError extends Error {
  constructor(problems) {
    super(problems.map((p) => `${p.path}: ${p.message}`).join('\n'))
    this.name = 'PlanError'
    this.problems = problems
  }
}

// Setzt die Größe ein und berechnet pro Block den Start-Offset. Die
// Reihen eines Blocks werden nur einmal gespeichert, nicht pro
// Wiederholung – rowAt rechnet die Position aus. Wirft PlanError bei
// ungültigem Plan oder unbekannter Größe. Das Ergebnis ist wieder
// reines JSON.
export function resolvePlan(plan, sizeId) {
  const problems = validatePlan(plan)
  if (problems.length > 0) throw new PlanError(problems)
  const size = plan.sizes.find((s) => s.id === sizeId)
  if (!size) {
    throw new PlanError([{ path: 'sizes', message: `Unbekannte Größe „${sizeId}“` }])
  }

  const fill = (text) => fillText(sizeValue(text, sizeId), plan.values, sizeId)
  const sections = []
  const blocks = []
  let nextRow = 1
  // Hin/Rück wechselt von Reihe zu Reihe, auch über Abschnittsgrenzen
  // hinweg. Ein Abschnitt mit eigenem firstSide setzt den Wechsel neu
  // (z. B. nach Faden abschneiden und neu ansetzen).
  let sideAnchor = plan.firstSide ?? 'RS'
  let rowsSinceAnchor = 0

  plan.sections.forEach((section, sectionIndex) => {
    const construction = section.construction ?? plan.construction ?? 'flat'
    const wsRows = section.wsRows ?? plan.wsRows ?? 'listed'
    const wsRowText = section.wsRowText ?? plan.wsRowText ?? DEFAULT_WS_ROW_TEXT
    const sectionRef = section.ref ?? plan.ref ?? null
    const sectionStart = nextRow
    if (section.firstSide) {
      sideAnchor = section.firstSide
      rowsSinceAnchor = 0
    }

    section.blocks.forEach((block, blockIndex) => {
      const blockRef = block.ref ?? sectionRef
      const listed = block.chart
        ? chartRows(block.chart)
        : block.rows ?? []
      let rows = listed.map((row) => ({
        label: row.label ?? null,
        text: fill(row.text),
        side: row.side ?? null,
        chartRow: row.chartRow ?? null,
        stitchesAfter: sizeValue(row.stitchesAfter, sizeId) ?? null,
        ref: row.ref ?? blockRef,
        implicit: false,
      }))
      if (construction === 'flat' && wsRows === 'implicit') {
        rows = rows.flatMap((row) => [
          { ...row, side: 'RS' },
          { ...row, label: null, text: wsRowText, side: 'WS', stitchesAfter: null, implicit: true },
        ])
      }
      const repeatCount = sizeValue(block.repeat, sizeId) ?? 1
      const rowCount = rows.length * repeatCount

      blocks.push({
        sectionIndex,
        blockIndex,
        construction,
        // Daraus ergibt sich Hin/Rück, wenn eine Reihe kein side hat:
        // Seite der Anker-Reihe und Abstand des Blockbeginns zu ihr.
        sideAnchor,
        sideOffset: rowsSinceAnchor,
        startRow: nextRow,
        rowCount,
        repeatCount,
        rows,
        stitchesAfter: sizeValue(block.stitchesAfter, sizeId) ?? null,
        note: block.note === undefined ? null : fill(block.note),
      })
      nextRow += rowCount
      rowsSinceAnchor += rowCount
    })

    sections.push({
      index: sectionIndex,
      title: section.title,
      note: section.note === undefined ? null : fill(section.note),
      startRow: sectionStart,
      rowCount: nextRow - sectionStart,
    })
  })

  return {
    title: plan.title,
    sizeId,
    sizeName: size.name,
    totalRows: nextRow - 1,
    sections,
    blocks,
  }
}

function chartRows({ from, to }) {
  const rows = []
  for (let k = from; k <= to; k++) {
    rows.push({ text: `Reihe ${k} nach Diagramm`, chartRow: k })
  }
  return rows
}

// ---------------------------------------------------------------------
// Navigation und Fortschritt (auf dem aufgelösten Plan)
// ---------------------------------------------------------------------

export function totalRows(resolved) {
  return resolved.totalRows
}

// Position der Reihe rowNumber oder null, wenn außerhalb des Plans
// (0 oder kleiner, bzw. hinter der letzten Reihe = fertig).
export function rowAt(resolved, rowNumber) {
  if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > resolved.totalRows) {
    return null
  }
  const block = findBlock(resolved.blocks, rowNumber)
  const offset = rowNumber - block.startRow
  const rowsPerRepeat = block.rows.length
  const repeat = Math.floor(offset / rowsPerRepeat) + 1
  const rowIndex = offset % rowsPerRepeat
  const row = block.rows[rowIndex]
  const isLastOfBlock = offset === block.rowCount - 1
  const section = resolved.sections[block.sectionIndex]

  return {
    rowNumber,
    sectionIndex: block.sectionIndex,
    sectionTitle: section.title,
    rowInSection: rowNumber - section.startRow + 1,
    rowsInSection: section.rowCount,
    blockIndex: block.blockIndex,
    repeat,
    repeatCount: block.repeatCount,
    rowInBlock: rowIndex + 1,
    rowsInBlock: rowsPerRepeat,
    label: row.label,
    text: row.text,
    side: sideOf(block, row, offset),
    chartRow: row.chartRow,
    implicit: row.implicit,
    stitchesAfter: row.stitchesAfter ?? (isLastOfBlock ? block.stitchesAfter : null),
    ref: row.ref,
  }
}

function sideOf(block, row, offsetInBlock) {
  if (block.construction === 'round') return null
  return row.side ?? alternatingSide(block, offsetInBlock)
}

function alternatingSide(block, offsetInBlock) {
  const parity = (block.sideOffset + offsetInBlock) % 2
  if (parity === 0) return block.sideAnchor
  return block.sideAnchor === 'RS' ? 'WS' : 'RS'
}

// Plausibilitätsprüfung (z. B. nach dem KI-Import): Reihen, deren
// angegebene Seite nicht zum Hin-/Rück-Wechsel passt – meist ein
// Hinweis auf eine vergessene oder doppelte Reihe. Liefert die
// Reihennummern; prüft jede Wiederholung, weil eine ungerade
// Reihenzahl im Block die Seiten von Wiederholung zu Wiederholung tauscht.
export function findSideConflicts(resolved) {
  const conflicts = []
  for (const block of resolved.blocks) {
    if (block.construction === 'round') continue
    for (let offset = 0; offset < block.rowCount; offset++) {
      const row = block.rows[offset % block.rows.length]
      if (row.side && row.side !== alternatingSide(block, offset)) {
        conflicts.push(block.startRow + offset)
      }
    }
  }
  return conflicts
}

// Binäre Suche: Blöcke sind nach startRow sortiert; Blöcke ohne Reihen
// (reine Notizen) werden übersprungen, weil sie keine Reihe enthalten.
function findBlock(blocks, rowNumber) {
  let lo = 0
  let hi = blocks.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const block = blocks[mid]
    if (rowNumber < block.startRow) hi = mid - 1
    else if (rowNumber >= block.startRow + block.rowCount) lo = mid + 1
    else return block
  }
  return null
}

// Nächste/vorige Reihe. Begrenzt auf 1 … totalRows + 1, wobei
// totalRows + 1 „fertig“ bedeutet.
export function stepRow(resolved, rowNumber, delta) {
  return Math.min(resolved.totalRows + 1, Math.max(1, rowNumber + delta))
}

export function isFinished(resolved, rowNumber) {
  return rowNumber > resolved.totalRows
}

// Erste Reihe eines Abschnitts (für „springe zu Abnahmen“). Hat der
// Abschnitt keine Reihen, ist das die erste Reihe danach.
export function sectionStartRow(resolved, sectionIndex) {
  const section = resolved.sections[sectionIndex]
  return section ? section.startRow : null
}

export function progress(resolved, rowNumber) {
  const total = resolved.totalRows
  const done = Math.min(total, Math.max(0, rowNumber - 1))
  const position = rowAt(resolved, rowNumber)
  const section = position ? resolved.sections[position.sectionIndex] : null
  return {
    done,
    total,
    fraction: total === 0 ? 1 : done / total,
    sectionIndex: section ? section.index : null,
    sectionDone: section ? rowNumber - section.startRow : null,
    sectionTotal: section ? section.rowCount : null,
  }
}

// Der Reihenzähler zählt fertige Reihen. rowOffset ist der Zählerstand,
// bei dem der Plan begonnen wurde (falls schon vorher gestrickt wurde).
export function currentRowFromCounter(counterValue, rowOffset = 0) {
  return Math.max(1, counterValue - rowOffset + 1)
}
