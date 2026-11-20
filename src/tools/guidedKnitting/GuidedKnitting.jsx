import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addKnittingPlan, deleteKnittingPlan } from '../../data/db.js'
import {
  currentRowFromCounter,
  isFinished,
  progress,
  resolvePlan,
  rowAt,
  sectionStartRow,
  stepRow,
} from '../knittingPlan/planLogic.js'
import { sophieScarf } from '../knittingPlan/examples/sophieScarf.js'
import { vitaScarf } from '../knittingPlan/examples/vitaScarf.js'
import PatternViewer from '../pattern/PatternViewer.jsx'
import AiImport from './AiImport.jsx'
import {
  blockNote,
  notesBeforeRow,
  parsePlanJson,
  pickRefFile,
  rowOffsetForRow,
  sideLabel,
} from './guidedLogic.js'
import './GuidedKnitting.css'

const EXAMPLES = [sophieScarf, vitaScarf]
const EMPTY = { planId: null, sizeId: null, rowOffset: 0 }

// Robust gegen unerwartete gespeicherte Werte (vgl. fileIdsOf im
// Anleitungs-Tool): ein kaputter Wert soll nur „kein Plan“ bedeuten.
function settingsOf(value) {
  return {
    planId: value?.planId ?? null,
    sizeId: value?.sizeId ?? null,
    rowOffset: Number.isFinite(value?.rowOffset) ? value.rowOffset : 0,
  }
}

// Geführtes Stricken: zeigt zum Stand des Reihenzählers die passende
// Reihe des Strickplans. Der Zähler wird nur gelesen, nie verändert –
// Sprünge im Plan verschieben stattdessen rowOffset.
// value = { planId, sizeId, rowOffset }, der Plan liegt in knittingPlans.
function GuidedKnitting({ label, value, onChange, projectId }) {
  const settings = settingsOf(value)
  const [editing, setEditing] = useState(false)

  // undefined = lädt noch, null = kein Plan (oder gelöscht)
  const record = useLiveQuery(
    async () =>
      settings.planId == null
        ? null
        : ((await db.knittingPlans.get(settings.planId)) ?? null),
    [settings.planId]
  )
  // Stand des Reihenzählers im selben Projekt (null = kein Zähler).
  const counter = useLiveQuery(async () => {
    const project = await db.projects.get(projectId)
    const rowCounter = project?.tools.find((tool) => tool.type === 'rowCounter')
    return rowCounter ? Number(rowCounter.value) || 0 : null
  }, [projectId])
  const projectFileIds = useLiveQuery(
    () => db.patternFiles.where('projectId').equals(projectId).primaryKeys(),
    [projectId]
  )

  async function loadPlan(plan) {
    const previousId = settings.planId
    const planId = await addKnittingPlan(projectId, plan)
    await onChange({
      planId,
      sizeId: plan.sizes.length === 1 ? plan.sizes[0].id : null,
      // Der Plan beginnt beim aktuellen Zählerstand mit Reihe 1.
      rowOffset: counter ?? 0,
    })
    if (previousId != null) await deleteKnittingPlan(previousId)
  }

  async function removePlan() {
    if (!window.confirm('Strickplan aus diesem Projekt entfernen?')) return
    const previousId = settings.planId
    await onChange(EMPTY)
    if (previousId != null) await deleteKnittingPlan(previousId)
    setEditing(false)
  }

  const plan = record?.plan
  const sizeKnown = plan?.sizes.some((size) => size.id === settings.sizeId)

  let body
  if (record === undefined || counter === undefined) {
    body = null
  } else if (!plan) {
    body = <PlanChooser projectId={projectId} onLoad={loadPlan} />
  } else if (!sizeKnown) {
    body = (
      <SizePicker
        plan={plan}
        onPick={(sizeId) => onChange((current) => ({ ...settingsOf(current), sizeId }))}
        onRemove={removePlan}
      />
    )
  } else {
    body = (
      <Guide
        plan={plan}
        settings={settings}
        counter={counter}
        projectFileIds={projectFileIds ?? []}
        editing={editing}
        onChange={onChange}
        onRemove={removePlan}
      />
    )
  }

  return (
    <section>
      <p className="section-header">
        <span>{label}</span>
        {plan && sizeKnown && (
          <button
            type="button"
            className="guided-edit-toggle"
            onClick={() => setEditing((was) => !was)}
          >
            {editing ? 'Fertig' : 'Bearbeiten'}
          </button>
        )}
      </p>
      {body}
    </section>
  )
}

function PlanChooser({ projectId, onLoad }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  async function run(task) {
    setBusy(true)
    try {
      await task()
    } catch (error) {
      console.error(error)
      window.alert('Der Strickplan konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return
    const { plan, problems } = parsePlanJson(await file.text())
    if (problems) {
      const list = problems
        .slice(0, 5)
        .map((p) => `• ${p.path ? `${p.path}: ` : ''}${p.message}`)
        .join('\n')
      const more = problems.length > 5 ? `\n… und ${problems.length - 5} weitere` : ''
      window.alert(`Der Strickplan ist nicht gültig:\n${list}${more}`)
      return
    }
    run(() => onLoad(plan))
  }

  if (aiOpen) {
    return (
      <AiImport
        projectId={projectId}
        onLoad={onLoad}
        onCancel={() => setAiOpen(false)}
      />
    )
  }

  return (
    <>
      <div className="cell-group tone-rose">
        <button
          type="button"
          className="cell-row guided-row"
          onClick={() => setAiOpen(true)}
          disabled={busy}
        >
          <span className="guided-row-main">
            <span>Aus Anleitung erstellen</span>
            <span className="guided-row-sub">mit KI, aus deiner PDF oder deinem Foto</span>
          </span>
          <span className="guided-chevron" aria-hidden="true">
            ›
          </span>
        </button>
        {EXAMPLES.map((example) => (
          <button
            key={example.title}
            type="button"
            className="cell-row guided-row"
            onClick={() => run(() => onLoad(example))}
            disabled={busy}
          >
            <span className="guided-row-main">
              <span>{example.title}</span>
              <span className="guided-row-sub">Beispielplan</span>
            </span>
            <span className="guided-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
        <button
          type="button"
          className="cell-row guided-row guided-action"
          onClick={() => inputRef.current.click()}
          disabled={busy}
        >
          + Plan aus JSON-Datei importieren
        </button>
      </div>
      <p className="section-footer">
        Ein Strickplan beschreibt die Anleitung Reihe für Reihe. Hier siehst
        du dann passend zum Reihenzähler, was als Nächstes kommt.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        hidden
      />
    </>
  )
}

function SizePicker({ plan, onPick, onRemove }) {
  return (
    <>
      <div className="cell-group tone-rose">
        <div className="cell-row guided-heading">
          <span className="guided-plan-title">{plan.title}</span>
          <span className="guided-row-sub">Welche Größe strickst du?</span>
        </div>
        {plan.sizes.map((size) => (
          <button
            key={size.id}
            type="button"
            className="cell-row guided-row"
            onClick={() => onPick(size.id)}
          >
            <span className="guided-row-main">{size.name}</span>
            <span className="guided-chevron" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
        <button
          type="button"
          className="cell-row guided-row guided-destructive"
          onClick={onRemove}
        >
          Plan entfernen
        </button>
      </div>
    </>
  )
}

function Guide({ plan, settings, counter, projectFileIds, editing, onChange, onRemove }) {
  const [viewerRef, setViewerRef] = useState(null)

  const resolved = useMemo(() => {
    try {
      return resolvePlan(plan, settings.sizeId)
    } catch (error) {
      console.error(error)
      return null
    }
  }, [plan, settings.sizeId])

  if (!resolved) {
    return (
      <div className="cell-group tone-rose">
        <p className="cell-row guided-message">
          Dieser Strickplan lässt sich nicht anzeigen.
        </p>
        <button
          type="button"
          className="cell-row guided-row guided-destructive"
          onClick={onRemove}
        >
          Plan entfernen
        </button>
      </div>
    )
  }

  const count = counter ?? 0
  const rowNumber = currentRowFromCounter(count, settings.rowOffset)
  const position = rowAt(resolved, rowNumber)
  const finished = isFinished(resolved, rowNumber)
  const stats = progress(resolved, rowNumber)
  const before = notesBeforeRow(resolved, rowNumber)

  // Plan an eine andere Reihe setzen, ohne den Reihenzähler zu ändern.
  function goToRow(targetRow) {
    onChange((current) => ({
      ...settingsOf(current),
      rowOffset: rowOffsetForRow(count, targetRow),
    }))
  }

  const fileId = position ? pickRefFile(position.ref, projectFileIds) : null

  return (
    <>
      <div className="cell-group tone-rose">
        {before.map((item, index) => (
          <div key={index} className="cell-row guided-before">
            <span className="guided-row-sub">Vorher · {item.sectionTitle}</span>
            <span>{item.note}</span>
          </div>
        ))}

        {finished ? (
          <div className="cell-row guided-card">
            <span className="guided-row-title">Fertig gestrickt!</span>
            <span className="guided-text">
              Alle {resolved.totalRows} Reihen von „{resolved.title}“ sind geschafft.
            </span>
          </div>
        ) : (
          position && (
            <RowCard
              position={position}
              note={blockNote(resolved, position)}
              canOpen={fileId != null}
              onOpen={() => setViewerRef({ ...position.ref, fileId })}
            />
          )
        )}

        <div className="cell-row guided-progress">
          <div
            className="guided-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={stats.total}
            aria-valuenow={stats.done}
          >
            <div style={{ width: `${Math.round(stats.fraction * 100)}%` }} />
          </div>
          <span className="guided-progress-text">
            {finished
              ? `${stats.total} von ${stats.total} Reihen`
              : `Reihe ${rowNumber} von ${stats.total}`}{' '}
            · {Math.round(stats.fraction * 100)} %
          </span>
          {position && stats.sectionTotal > 1 && (
            <span className="guided-row-sub">
              {position.sectionTitle}: Reihe {stats.sectionDone + 1} von{' '}
              {stats.sectionTotal}
            </span>
          )}
        </div>
      </div>
      <p className="section-footer">
        {counter === null
          ? 'Kein Reihenzähler im Projekt – der Plan bleibt bei Reihe 1.'
          : // Zuordnung immer zeigen: Nach einem Sprung ist der Plan
            // gegenüber dem Zähler verschoben, das soll sichtbar sein.
            `Reihenzähler ${count} → ${
              finished ? 'Plan fertig' : `Reihe ${rowNumber} im Plan`
            }.${
              fileId != null && !finished ? ' Tippe auf die Karte für die Anleitung.' : ''
            }`}
      </p>

      {editing && (
        <PlanSettings
          plan={plan}
          resolved={resolved}
          settings={settings}
          rowNumber={rowNumber}
          onStep={(delta) => goToRow(stepRow(resolved, rowNumber, delta))}
          // null = Anfang der Anleitung (Reihe 1)
          onJump={(sectionIndex) =>
            goToRow(sectionIndex == null ? 1 : sectionStartRow(resolved, sectionIndex))
          }
          onSize={(sizeId) =>
            onChange((current) => ({ ...settingsOf(current), sizeId }))
          }
          onRemove={onRemove}
        />
      )}

      {viewerRef && (
        <PatternViewer
          fileId={viewerRef.fileId}
          highlight={{ page: viewerRef.page, rect: viewerRef.rect }}
          onClose={() => setViewerRef(null)}
        />
      )}
    </>
  )
}

function RowCard({ position, note, canOpen, onOpen }) {
  const side = sideLabel(position.side)
  // Diagrammreihen ohne eigenes Label haben nur den generierten Text
  // „Reihe k nach Diagramm“ – der steckt dann schon im Titel.
  const chartOnly = position.label == null && position.chartRow != null
  const title =
    position.label ??
    (chartOnly ? `Diagrammreihe ${position.chartRow}` : `Reihe ${position.rowInBlock}`)
  const content = (
    <>
      <span className="guided-meta">
        <span className="guided-section">{position.sectionTitle}</span>
        {side && <span className="guided-side">{side}</span>}
      </span>
      <span className="guided-row-title">{title}</span>
      {!chartOnly && <span className="guided-text">{position.text}</span>}
      {position.stitchesAfter != null && (
        <span className="guided-stitches">
          Danach {position.stitchesAfter} Maschen
        </span>
      )}
      {note && <span className="guided-note">{note}</span>}
      <span className="guided-row-sub">
        {position.repeatCount > 1 &&
          `Wiederholung ${position.repeat} von ${position.repeatCount} · `}
        Reihe {position.rowInBlock} von {position.rowsInBlock}
      </span>
      {canOpen && <span className="guided-open">Anleitung öffnen ›</span>}
    </>
  )
  return canOpen ? (
    <button type="button" className="cell-row guided-card guided-card-button" onClick={onOpen}>
      {content}
    </button>
  ) : (
    <div className="cell-row guided-card">{content}</div>
  )
}

function PlanSettings({ plan, resolved, settings, rowNumber, onStep, onJump, onSize, onRemove }) {
  return (
    <div className="guided-settings">
      <p className="section-header">Plan</p>
      <div className="cell-group tone-rose">
        <div className="cell-row guided-heading">
          <span className="guided-plan-title">{plan.title}</span>
        </div>
        {plan.sizes.length > 1 && (
          <label className="cell-row guided-size">
            <span>Größe</span>
            <select
              value={settings.sizeId}
              onChange={(event) => onSize(event.target.value)}
            >
              {plan.sizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="cell-row guided-stepper">
          <span className="guided-row-main">
            <span>Plan-Reihe</span>
            <span className="guided-row-sub">ändert den Zähler nicht</span>
          </span>
          <button
            type="button"
            className="guided-step"
            onClick={() => onStep(-1)}
            disabled={rowNumber <= 1}
            aria-label="Plan eine Reihe zurück"
          >
            −
          </button>
          <span className="guided-step-value">
            {Math.min(rowNumber, resolved.totalRows + 1)}
          </span>
          <button
            type="button"
            className="guided-step"
            onClick={() => onStep(1)}
            disabled={rowNumber > resolved.totalRows}
            aria-label="Plan eine Reihe weiter"
          >
            +
          </button>
        </div>
      </div>

      <p className="section-header">Springen zu</p>
      <div className="cell-group tone-rose">
        <button
          type="button"
          className="cell-row guided-row"
          onClick={() => onJump(null)}
        >
          <span className="guided-row-main">
            <span>Anfang der Anleitung</span>
            <span className="guided-row-sub">Reihe 1</span>
          </span>
          <span className="guided-chevron" aria-hidden="true">
            ›
          </span>
        </button>
        {resolved.sections
          .filter((section) => section.rowCount > 0)
          .map((section) => (
            <button
              key={section.index}
              type="button"
              className="cell-row guided-row"
              onClick={() => onJump(section.index)}
            >
              <span className="guided-row-main">
                <span>{section.title}</span>
                <span className="guided-row-sub">
                  ab Reihe {section.startRow} · {section.rowCount}{' '}
                  {section.rowCount === 1 ? 'Reihe' : 'Reihen'}
                </span>
              </span>
              <span className="guided-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          ))}
      </div>

      <div className="cell-group tone-rose">
        <button
          type="button"
          className="cell-row guided-row guided-destructive"
          onClick={onRemove}
        >
          Plan entfernen
        </button>
      </div>
    </div>
  )
}

export default GuidedKnitting
