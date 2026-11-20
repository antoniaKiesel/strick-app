import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSetting, setSetting } from '../../data/db.js'
import { ImportError, importPlanFromFile } from '../knittingPlan/claudeImport.js'

const KEY_SETTING = 'anthropicApiKey'

// Strickplan aus einer angehängten Anleitung erzeugen lassen. Der Plan
// wird erst nach erfolgreicher Prüfung über onLoad übernommen; danach
// folgt wie bei jedem Plan die Größenwahl.
function AiImport({ projectId, onLoad, onCancel }) {
  // Nur Name/Typ für die Auswahl – die Blobs lädt erst der Import.
  const files = useLiveQuery(
    async () =>
      (await db.patternFiles.where('projectId').equals(projectId).toArray()).map(
        ({ id, name, mimeType }) => ({ id, name, mimeType })
      ),
    [projectId]
  )
  const storedKey = useLiveQuery(() => getSetting(KEY_SETTING), [])
  const [chosenId, setChosenId] = useState(null)
  const [keyInput, setKeyInput] = useState('')
  const [status, setStatus] = useState(null) // Text während des Imports
  const [error, setError] = useState(null) // ImportError
  const abortRef = useRef(null)

  // Beim Schließen einen laufenden Import abbrechen.
  useEffect(() => () => abortRef.current?.abort(), [])

  const fileId = chosenId ?? files?.[0]?.id ?? null
  const apiKey = storedKey ?? keyInput.trim()
  const busy = status !== null

  async function start() {
    setError(null)
    setStatus('Anleitung wird vorbereitet …')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      if (!storedKey) await setSetting(KEY_SETTING, apiKey)
      const file = await db.patternFiles.get(fileId)
      const { plan, warnings } = await importPlanFromFile({
        apiKey,
        file,
        onStatus: setStatus,
        signal: controller.signal,
      })
      const accepted =
        warnings.length === 0 ||
        window.confirm(
          `Bitte prüfen:\n${warnings.join('\n')}\n\nPlan trotzdem übernehmen?`
        )
      if (accepted) await onLoad(plan)
    } catch (caught) {
      setError(caught instanceof ImportError ? caught : new ImportError(String(caught)))
    } finally {
      abortRef.current = null
      setStatus(null)
    }
  }

  if (files === undefined || storedKey === undefined) return null

  return (
    <>
      <div className="cell-group tone-rose">
        <div className="cell-row guided-heading">
          <span className="guided-plan-title">Plan mit KI erstellen</span>
          <span className="guided-row-sub">
            Claude liest deine Anleitung und schlägt einen Strickplan vor.
          </span>
        </div>

        {files.length === 0 ? (
          <p className="cell-row guided-message">
            Hänge zuerst unten unter „Anleitung“ eine PDF oder ein Foto an.
          </p>
        ) : (
          files.map((file) => (
            <button
              key={file.id}
              type="button"
              className="cell-row guided-row"
              onClick={() => setChosenId(file.id)}
              disabled={busy}
              aria-pressed={file.id === fileId}
            >
              <span className="guided-row-main">
                <span>{file.name}</span>
                <span className="guided-row-sub">
                  {file.mimeType === 'application/pdf' ? 'PDF' : 'Foto'}
                </span>
              </span>
              <span className="guided-check" aria-hidden="true">
                {file.id === fileId ? '✓' : ''}
              </span>
            </button>
          ))
        )}

        {storedKey ? (
          <div className="cell-row guided-key">
            <span className="guided-row-main">
              <span>API-Key</span>
              <span className="guided-row-sub">auf diesem Gerät gespeichert</span>
            </span>
            <button
              type="button"
              className="guided-inline-action guided-destructive-text"
              onClick={() => setSetting(KEY_SETTING, null)}
              disabled={busy}
            >
              Entfernen
            </button>
          </div>
        ) : (
          <div className="cell-row guided-key">
            <input
              type="password"
              aria-label="API-Key"
              className="guided-key-input"
              placeholder="API-Key (sk-ant-…)"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={keyInput}
              onChange={(event) => setKeyInput(event.target.value)}
              disabled={busy}
            />
          </div>
        )}

        {busy ? (
          <div className="cell-row guided-busy">
            <span className="guided-spinner" aria-hidden="true" />
            <span className="guided-row-main">{status}</span>
            <button
              type="button"
              className="guided-inline-action"
              onClick={() => abortRef.current?.abort()}
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div className="cell-row guided-actions">
            <button type="button" className="guided-inline-action" onClick={onCancel}>
              Zurück
            </button>
            <button
              type="button"
              className="ios-button guided-start"
              onClick={start}
              disabled={fileId == null || apiKey === ''}
            >
              Plan erstellen
            </button>
          </div>
        )}

        {error && (
          <div className="cell-row guided-error" role="alert">
            <span>{error.message}</span>
            {error.problems.length > 0 && (
              <ul>
                {error.problems.slice(0, 5).map((problem, index) => (
                  <li key={index}>
                    {problem.path ? `${problem.path}: ` : ''}
                    {problem.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <p className="section-footer">
        {storedKey
          ? 'Dauert meist ein bis zwei Minuten und kostet je nach Länge der Anleitung einige Cent. Prüfe den Plan danach kurz.'
          : 'Den API-Key bekommst du unter platform.claude.com. Er bleibt nur auf diesem iPhone gespeichert und geht direkt an Claude.'}
      </p>
    </>
  )
}

export default AiImport
