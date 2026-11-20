// Reine Logik für den KI-Import (ohne Netzwerk, ohne React): Auftrag an
// das Modell, Antwort auslesen, Ergebnis prüfen. Der eigentliche
// API-Aufruf steht in claudeImport.js.

import { PLAN_VERSION, findSideConflicts, resolvePlan, validatePlan } from './planLogic.js'

// Die Datei-id kennt das Modell nicht – es schreibt diesen Platzhalter,
// beim Prüfen wird er durch die echte id ersetzt.
export const FILE_PLACEHOLDER = 0

// Systemauftrag: beschreibt das Modell aus README.md so knapp, dass das
// Modell gültige Pläne schreibt. Bleibt bei jedem Aufruf gleich (gut für
// Prompt-Caching und Nachvollziehbarkeit).
export const IMPORT_SYSTEM_PROMPT = `Du wandelst Strickanleitungen in einen Strickplan im JSON-Format um. Eine App zeigt damit beim Stricken passend zum Reihenzähler die aktuelle Reihe an. Die Strickerin verlässt sich Reihe für Reihe darauf, deshalb ist Genauigkeit wichtiger als Vollständigkeit der Texte.

Antworte mit genau einem JSON-Objekt in einem \`\`\`json-Codeblock und sonst nichts.

Aufbau:
{
  "version": ${PLAN_VERSION},
  "title": "Name der Anleitung",
  "sizes": [{ "id": "kurze-id", "name": "Anzeigename" }],      // mindestens eine Größe
  "values": { "name": Größenwert },                            // optional, für Platzhalter {name} in Texten
  "construction": "flat" | "round",                            // optional, Standard "flat" (Hin- und Rückreihen)
  "wsRows": "listed" | "implicit",                             // optional, Standard "listed"
  "wsRowText": "Text für ergänzte Rückreihen",                 // optional
  "firstSide": "RS" | "WS",                                    // Seite der allerersten Reihe, Standard "RS"
  "sections": [{
    "title": "Abschnitt, z. B. Bündchen",
    "note": "optional",
    "ref": Verweis,                                            // optional
    "construction" / "wsRows" / "wsRowText" / "firstSide": optional, überschreiben den Plan
    "blocks": [{
      "repeat": Größenwert,                                    // ganze Zahl ≥ 1, wie oft die Reihen des Blocks wiederholt werden, Standard 1
      "stitchesAfter": Größenwert,                             // optional, Maschenzahl nach der letzten Wiederholung
      "note": "optional",
      "ref": Verweis,                                          // optional
      "rows": [{ "label": "8. Reihe", "text": Größenwert, "side": "RS" | "WS", "stitchesAfter": Größenwert, "ref": Verweis }]
      // ODER statt rows bei Strickschrift: "chart": { "from": 1, "to": 18 }  (Diagrammreihen from bis to)
    }]
  }]
}

Größenwert: entweder ein einfacher Wert für alle Größen oder ein Objekt { "größen-id": Wert } mit einem Eintrag für JEDE Größe. Aus „22 (27) Mal“ wird { "s": 22, "l": 27 }.
Verweis: { "fileId": ${FILE_PLACEHOLDER}, "page": Seitenzahl ab 1, "rect": { "x": 0.1, "y": 0.2, "w": 0.8, "h": 0.1 } }. rect ist die Stelle auf der Seite, relativ zur Seitengröße (0–1, x/y = linke obere Ecke). fileId ist immer ${FILE_PLACEHOLDER}. Gib pro Block oder Abschnitt einen Verweis auf die Stelle in der Anleitung an, wenn du sie sicher erkennst.

Regeln:
- Eine Reihe im Plan ist genau eine gestrickte Reihe oder Runde. Nennt die Anleitung nur Hinreihen („alle Rückreihen links“), nutze "wsRows": "implicit" und ggf. "wsRowText"; die App ergänzt die Rückreihen.
- "side" nur angeben, wenn die Anleitung die Seite nennt (Hin-R/Rück-R, RS/WS). Ohne Angabe wechselt die App automatisch ab "firstSide". Bei Runden ("round") keine Seite.
- Verweise wie „wie 1. Reihe“ schreibst du aus, damit jede Reihe ihren vollständigen Text hat.
- Offene Wiederholungen („bis die gewünschte Länge erreicht ist“, „so lange das Garn reicht“) brauchen trotzdem eine ganze Zahl: nimm die Angabe der Anleitung für die jeweilige Größe; fehlt sie, schätze sinnvoll und schreibe in "note", dass die Zahl angepasst werden kann.
- Anweisungen ohne eigene Reihe (Anschlag, Abketten ohne Reihe, Fäden vernähen) werden ein Block nur mit "note" und ohne "rows".
- Bei Strickschrift: Diagrammreihen über "chart" angeben; Rapporte zwischen Linien als eigener Block mit "repeat".
- Texte auf Deutsch, knapp und in eigenen Worten mit den üblichen Abkürzungen (re, li, M, Zun, Abn, U). Maschenzahlen und Wiederholungen exakt aus der Anleitung übernehmen.
- Teile, die nicht gestrickt werden (Material, Maschenprobe, Pflege), gehören nicht in den Plan.`

export const IMPORT_USER_PROMPT =
  'Erstelle den Strickplan für diese Anleitung. Prüfe vor der Antwort, ob die Reihenzahlen und Wiederholungen pro Größe mit der Anleitung übereinstimmen.'

// Holt das JSON aus der Modellantwort: bevorzugt den ```json-Block,
// sonst das erste vollständige {...}. Gibt { plan } oder { problems }.
export function extractPlanJson(text) {
  const fenced = /```(?:json)?\s*\n([\s\S]*?)```/.exec(text)
  const candidate = fenced
    ? fenced[1]
    : text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  if (!candidate.trim()) {
    return { problems: [{ path: '', message: 'Die Antwort enthält kein JSON' }] }
  }
  try {
    return { plan: JSON.parse(candidate) }
  } catch {
    return { problems: [{ path: '', message: 'Das JSON in der Antwort ist fehlerhaft' }] }
  }
}

// Ersetzt den Platzhalter in allen Verweisen durch die echte Datei-id.
// Arbeitet auf einer Kopie, damit der Rohplan unverändert bleibt.
export function attachFile(plan, fileId) {
  const copy = structuredClone(plan)
  const fix = (owner) => {
    if (owner?.ref && typeof owner.ref === 'object') {
      owner.ref = { ...owner.ref, fileId }
    }
  }
  fix(copy)
  for (const section of Array.isArray(copy.sections) ? copy.sections : []) {
    fix(section)
    for (const block of Array.isArray(section?.blocks) ? section.blocks : []) {
      fix(block)
      for (const row of Array.isArray(block?.rows) ? block.rows : []) fix(row)
    }
  }
  return copy
}

// Prüft einen importierten Plan. Liefert die Modellfehler (problems)
// und Hinweise für die Strickerin (warnings): Seitenkonflikte deuten auf
// vergessene oder doppelte Reihen hin.
export function checkImportedPlan(plan) {
  const problems = validatePlan(plan)
  if (problems.length > 0) return { problems, warnings: [] }
  const warnings = []
  for (const size of plan.sizes) {
    const conflicts = findSideConflicts(resolvePlan(plan, size.id))
    if (conflicts.length > 0) {
      warnings.push(
        `Größe ${size.name}: Hin/Rück passt bei ${conflicts.length} ${
          conflicts.length === 1 ? 'Reihe' : 'Reihen'
        } nicht zum Wechsel (ab Reihe ${conflicts[0]}).`
      )
    }
  }
  return { problems: [], warnings }
}

// Rückmeldung an das Modell für einen Korrekturversuch.
export function repairPrompt(problems) {
  const list = problems
    .slice(0, 30)
    .map((p) => `- ${p.path || '(Plan)'}: ${p.message}`)
    .join('\n')
  return `Der Plan ist so noch nicht gültig:\n${list}\n\nKorrigiere diese Stellen und antworte wieder mit dem vollständigen Plan als einem \`\`\`json-Codeblock.`
}
