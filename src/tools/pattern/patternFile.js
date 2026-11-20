// Reine Hilfsfunktionen rund um Anleitungsdateien (ohne React/Dexie).

// Was die Dateiauswahl anbietet. Auf dem iPhone erscheinen damit
// Fotomediathek, Kamera und die Dateien-App.
export const ACCEPTED_TYPES = 'application/pdf,image/*'

export function isPdf(file) {
  return file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.name ?? '')
}

export function isSupportedFile(file) {
  return (
    isPdf({ mimeType: file.type, name: file.name }) ||
    file.type.startsWith('image/')
  )
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
