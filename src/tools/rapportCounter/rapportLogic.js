// Fachliche Logik des Rapportzählers, bewusst ohne React/Dexie:
// reine Funktionen über { current, total }. Bei einer späteren
// SwiftUI-Portierung entspricht das 1:1 Methoden auf einem Swift-struct.

export const MIN_TOTAL = 1
export const MAX_TOTAL = 99

export function stepRapport(value, delta) {
  const current = Math.min(value.total, Math.max(0, value.current + delta))
  return current === value.current ? value : { ...value, current }
}

export function changeTotal(value, delta) {
  const total = Math.min(MAX_TOTAL, Math.max(MIN_TOTAL, value.total + delta))
  if (total === value.total) return value
  // Schrumpft die Gesamtzahl unter den Stand, wird der Stand mitgekappt.
  return { total, current: Math.min(value.current, total) }
}

export function resetRapport(value) {
  return value.current === 0 ? value : { ...value, current: 0 }
}

export function isDone(value) {
  return value.current >= value.total
}
