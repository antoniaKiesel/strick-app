// KI-Import: schickt eine angehängte Anleitung (PDF oder Foto) an die
// Claude API und gibt einen geprüften Strickplan zurück.
//
// Der API-Key der Nutzerin liegt nur lokal auf dem Gerät (Tabelle
// settings) und geht direkt an api.anthropic.com – die App hat keinen
// eigenen Server. Deshalb dangerouslyAllowBrowser: Das SDK warnt sonst
// zu Recht, weil ein Key im Browser für alle sichtbar wäre, die Zugriff
// auf das Gerät oder den Code haben. Für eine private App mit dem
// eigenen Key ist das bewusst in Kauf genommen.
//
// Das SDK wird nur per import() geladen (eigener Chunk), damit es die
// App nicht beim Start ausbremst.

import {
  IMPORT_SYSTEM_PROMPT,
  IMPORT_USER_PROMPT,
  attachFile,
  checkImportedPlan,
  extractPlanJson,
  repairPrompt,
} from './planImport.js'

const MODEL = 'claude-opus-5-5'

export class ImportError extends Error {
  constructor(message, problems = []) {
    super(message)
    this.name = 'ImportError'
    this.problems = problems
  }
}

// Blob → base64 ohne data:-Präfix (FileReader statt btoa über einen
// String, das wäre bei großen PDFs langsam und speicherhungrig).
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function fileBlock(file) {
  const data = await blobToBase64(file.blob)
  if (file.mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data },
    }
  }
  return {
    type: 'image',
    source: { type: 'base64', media_type: file.mimeType, data },
  }
}

// Ein Durchgang: Antwort streamen (lange Ausgaben würden sonst in einen
// HTTP-Timeout laufen) und den Text der fertigen Nachricht zurückgeben.
async function ask(client, messages, signal) {
  const stream = client.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 64000,
      // Reihen zählen und Größen zuordnen braucht Sorgfalt.
      output_config: { effort: 'high' },
      // Lehnt das Modell aus Sicherheitsgründen ab, übernimmt
      // serverseitig automatisch ein passendes anderes Modell.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: IMPORT_SYSTEM_PROMPT,
      messages,
    },
    { signal }
  )
  const message = await stream.finalMessage()
  if (message.stop_reason === 'refusal') {
    throw new ImportError('Claude hat die Anfrage abgelehnt.')
  }
  if (message.stop_reason === 'max_tokens') {
    throw new ImportError('Die Anleitung ist zu lang für einen Durchgang.')
  }
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
  return { message, text }
}

// file = Datensatz aus patternFiles ({ id, blob, mimeType, … }).
// onStatus(text) meldet den Fortschritt für die Oberfläche.
// Gibt { plan, warnings } zurück oder wirft ImportError.
export async function importPlanFromFile({ apiKey, file, onStatus, signal }) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const messages = [
    {
      role: 'user',
      content: [await fileBlock(file), { type: 'text', text: IMPORT_USER_PROMPT }],
    },
  ]

  try {
    onStatus?.('Claude liest die Anleitung …')
    let { message, text } = await ask(client, messages, signal)

    // Höchstens ein Korrekturversuch: die Fehler aus validatePlan gehen
    // zurück ans Modell (die bisherige Antwort bleibt im Verlauf).
    for (let attempt = 0; ; attempt++) {
      const extracted = extractPlanJson(text)
      const plan = extracted.plan && attachFile(extracted.plan, file.id)
      const problems = extracted.problems ?? checkImportedPlan(plan).problems
      if (problems.length === 0) {
        return { plan, warnings: checkImportedPlan(plan).warnings }
      }
      if (attempt >= 1) {
        throw new ImportError('Der erzeugte Plan ist nicht gültig.', problems)
      }
      onStatus?.('Claude korrigiert den Plan …')
      messages.push({ role: 'assistant', content: message.content })
      messages.push({ role: 'user', content: repairPrompt(problems) })
      ;({ message, text } = await ask(client, messages, signal))
    }
  } catch (error) {
    throw toImportError(error, Anthropic)
  }
}

// API-Fehler in verständliche Meldungen übersetzen – über die
// typisierten Fehlerklassen des SDK, vom speziellsten zum allgemeinsten.
function toImportError(error, Anthropic) {
  if (error instanceof ImportError) return error
  if (error instanceof Anthropic.APIUserAbortError) return new ImportError('Abgebrochen.')
  if (error instanceof Anthropic.AuthenticationError) {
    return new ImportError('Der API-Key ist ungültig.')
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new ImportError('Der API-Key hat keinen Zugriff auf das Modell.')
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ImportError('Zu viele Anfragen – bitte gleich noch einmal versuchen.')
  }
  if (error instanceof Anthropic.ContentTooLargeError) {
    return new ImportError('Die Datei ist zu groß für Claude.')
  }
  if (error instanceof Anthropic.PaymentRequiredError) {
    return new ImportError('Kein API-Guthaben mehr – in der Claude Console aufladen.')
  }
  if (error instanceof Anthropic.BadRequestError) {
    // z. B. Datei zu groß oder Guthaben aufgebraucht – die Meldung der API
    // ist hier aussagekräftiger als eine eigene.
    return new ImportError(`Claude konnte die Anfrage nicht verarbeiten: ${error.message}`)
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new ImportError('Keine Verbindung zu Claude. Bist du online?')
  }
  if (error instanceof Anthropic.APIError) {
    return new ImportError('Claude ist gerade nicht erreichbar.')
  }
  console.error(error)
  return new ImportError('Unerwarteter Fehler beim Import.')
}
