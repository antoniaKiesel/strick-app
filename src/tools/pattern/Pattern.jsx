import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, addPatternFile, deletePatternFile } from '../../data/db.js'
import PatternViewer from './PatternViewer.jsx'
import {
  ACCEPTED_TYPES,
  formatSize,
  isPdf,
  isSupportedFile,
} from './patternFile.js'
import './Pattern.css'

// Gleicher Vertrag wie die anderen Tools (label, value, onChange), dazu
// projectId, weil die Dateien in der eigenen Tabelle patternFiles liegen.
// value = { fileIds: [...] } – nur Verweise, nicht die Dateien selbst.
// Mehrere Dateien pro Projekt, weil Anleitungen oft aus einer PDF plus
// Fotos (Strickschrift, Zeitschriftenseiten) bestehen.
function Pattern({ label, value, onChange, projectId }) {
  const inputRef = useRef(null)
  // id der Datei, die ersetzt werden soll; null = neue Datei anhängen
  const replaceTargetRef = useRef(null)
  const [openFileId, setOpenFileId] = useState(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  const { fileIds } = value
  // bulkGet liefert undefined für fehlende Datensätze – die überspringen wir.
  const files = useLiveQuery(
    async () => (await db.patternFiles.bulkGet(fileIds)).filter(Boolean),
    [fileIds]
  )

  function chooseFile(replaceId = null) {
    replaceTargetRef.current = replaceId
    inputRef.current.click()
  }

  async function handleFile(event) {
    const chosen = event.target.files[0]
    // Zurücksetzen, damit dieselbe Datei erneut gewählt werden kann.
    event.target.value = ''
    if (!chosen) return
    if (!isSupportedFile(chosen)) {
      window.alert('Bitte eine PDF oder ein Foto auswählen.')
      return
    }
    const replaceId = replaceTargetRef.current
    setBusy(true)
    try {
      // Erst die neue Datei sichern, dann den Verweis umhängen, dann die
      // alte löschen – so geht bei einem Fehler nie eine Anleitung verloren.
      const newId = await addPatternFile(projectId, chosen)
      await onChange((current) => ({
        ...current,
        fileIds:
          replaceId == null
            ? [...current.fileIds, newId]
            : current.fileIds.map((id) => (id === replaceId ? newId : id)),
      }))
      if (replaceId != null) await deletePatternFile(replaceId)
    } catch (error) {
      console.error(error)
      window.alert('Die Datei konnte nicht gespeichert werden.')
    } finally {
      setBusy(false)
    }
  }

  async function removeFile(file) {
    if (!window.confirm(`„${file.name}“ aus diesem Projekt entfernen?`)) {
      return
    }
    await onChange((current) => ({
      ...current,
      fileIds: current.fileIds.filter((id) => id !== file.id),
    }))
    await deletePatternFile(file.id)
    if (fileIds.length <= 1) setEditing(false)
  }

  const hasFiles = files?.length > 0

  return (
    <section>
      <p className="section-header">
        <span>{label}</span>
        {hasFiles && (
          <button
            type="button"
            className="pattern-edit-toggle"
            onClick={() => setEditing((was) => !was)}
          >
            {editing ? 'Fertig' : 'Bearbeiten'}
          </button>
        )}
      </p>
      <div className="cell-group tone-sky">
        {files?.map((file) =>
          editing ? (
            <div key={file.id} className="cell-row pattern-row">
              <FileIcon file={file} />
              <FileInfo file={file} />
              <button
                type="button"
                className="pattern-inline-action"
                onClick={() => chooseFile(file.id)}
                disabled={busy}
              >
                Ersetzen
              </button>
              <button
                type="button"
                className="pattern-inline-action pattern-remove"
                onClick={() => removeFile(file)}
                disabled={busy}
              >
                Entfernen
              </button>
            </div>
          ) : (
            <button
              key={file.id}
              type="button"
              className="cell-row pattern-row pattern-open"
              onClick={() => setOpenFileId(file.id)}
            >
              <FileIcon file={file} />
              <FileInfo file={file} />
              <span className="pattern-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          )
        )}
        {!editing && (
          <button
            type="button"
            className="cell-row pattern-row pattern-add"
            onClick={() => chooseFile()}
            disabled={busy || files === undefined}
          >
            {busy
              ? 'Wird gespeichert …'
              : hasFiles
                ? '+ Weitere Datei anhängen'
                : '+ Anleitung anhängen'}
          </button>
        )}
      </div>
      {files && !hasFiles && (
        <p className="section-footer">
          PDF oder Foto, z. B. aus der Fotomediathek oder der Dateien-App.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFile}
        hidden
      />

      {openFileId != null && (
        <PatternViewer
          fileId={openFileId}
          onClose={() => setOpenFileId(null)}
        />
      )}
    </section>
  )
}

function FileIcon({ file }) {
  return (
    <span className="pattern-icon" aria-hidden="true">
      {isPdf(file) ? <PdfIcon /> : <PhotoIcon />}
    </span>
  )
}

function FileInfo({ file }) {
  return (
    <span className="pattern-info">
      <span className="pattern-name">{file.name}</span>
      <span className="pattern-meta">
        {isPdf(file) ? 'PDF' : 'Foto'} · {formatSize(file.size)}
      </span>
    </span>
  )
}

function PdfIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <path d="M6 2.75h8.5L19 7.25V21.25H6z" />
      <path d="M14.5 2.75v4.5H19" />
      <path d="M9 12h7M9 15h7M9 18h4" strokeLinecap="round" />
    </svg>
  )
}

function PhotoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      <rect x="3" y="4.75" width="18" height="14.5" rx="2.5" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="M3.5 17l5-4.5 4 3.5 3-2.5 5 4" strokeLinecap="round" />
    </svg>
  )
}

export default Pattern
