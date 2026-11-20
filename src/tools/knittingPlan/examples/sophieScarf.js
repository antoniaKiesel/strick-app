// Strickplan nach einer echten Anleitung: „Sophie Scarf“ (PetiteKnit).
// Struktur und Zahlen stammen aus der Anleitung; die Texte sind bewusst
// gekürzt und umformuliert, weil die Originalanleitung urheberrechtlich
// geschützt ist und nicht ins Repo gehört.
//
// Typ: Reihe für Reihe ausgeschrieben, zwei Größen, Hin-/Rückreihen
// werden mitgezählt, zwei Wiederholungsblöcke mit Größenwerten.

const plain = 're bis 3 M vor Ende, 3 M li abheben (Faden vorn)'

export const sophieScarf = {
  version: 1,
  title: 'Sophie Scarf',
  sizes: [
    { id: 's', name: 'klein' },
    { id: 'l', name: 'groß' },
  ],
  values: {
    castOn: { s: 6, l: 6 },
  },
  construction: 'flat',
  wsRows: 'listed',
  firstSide: 'WS',
  sections: [
    {
      title: 'Anschlag',
      blocks: [{ note: '{castOn} M auf Rundnadel 3,5 mm anschlagen' }],
    },
    {
      title: 'Zunahmen',
      // fileId ist ein Beispielwert; in der App kommt er aus patternFiles.
      ref: { fileId: 1, page: 2, rect: { x: 0.05, y: 0.66, w: 0.9, h: 0.3 } },
      blocks: [
        {
          note: 'Zunahme in jeder 8. Reihe',
          repeat: { s: 22, l: 27 },
          stitchesAfter: { s: 28, l: 33 },
          rows: [
            { label: '1. Reihe', side: 'WS', text: plain },
            { label: '2. Reihe', side: 'RS', text: plain },
            { label: '3. Reihe', side: 'WS', text: `wie 1. Reihe: ${plain}` },
            { label: '4. Reihe', side: 'RS', text: `wie 2. Reihe: ${plain}` },
            { label: '5. Reihe', side: 'WS', text: `wie 1. Reihe: ${plain}` },
            { label: '6. Reihe', side: 'RS', text: `wie 2. Reihe: ${plain}` },
            { label: '7. Reihe', side: 'WS', text: `wie 1. Reihe: ${plain}` },
            { label: '8. Reihe', side: 'RS', text: '2 re, Zun, re bis 3 M vor Ende, 3 M abheben' },
          ],
        },
      ],
    },
    {
      title: 'Abnahmen',
      ref: { fileId: 1, page: 3, rect: { x: 0.05, y: 0.06, w: 0.9, h: 0.3 } },
      blocks: [
        {
          note: 'Abnahme in jeder 8. Reihe',
          repeat: { s: 21, l: 26 },
          stitchesAfter: { s: 7, l: 7 },
          rows: [
            { label: '1. Reihe', side: 'WS', text: plain },
            { label: '2. Reihe', side: 'RS', text: plain },
            { label: '3. Reihe', side: 'WS', text: `wie 1. Reihe: ${plain}` },
            { label: '4. Reihe', side: 'RS', text: `wie 2. Reihe: ${plain}` },
            { label: '5. Reihe', side: 'WS', text: `wie 1. Reihe: ${plain}` },
            { label: '6. Reihe', side: 'RS', text: `wie 2. Reihe: ${plain}` },
            { label: '7. Reihe', side: 'WS', text: `wie 1. Reihe: ${plain}` },
            { label: '8. Reihe', side: 'RS', text: '3 re, Abn, re bis 3 M vor Ende, 3 M abheben' },
          ],
        },
        {
          // „Stricke nun die 1.–7. Reihe wie oben“ – ausgeschrieben statt
          // als Verweis, damit die Logik keine Querbezüge kennen muss.
          note: '1.–7. Reihe noch einmal',
          rows: [
            { label: '1. Reihe', side: 'WS', text: plain },
            { label: '2. Reihe', side: 'RS', text: plain },
            { label: '3. Reihe', side: 'WS', text: plain },
            { label: '4. Reihe', side: 'RS', text: plain },
            { label: '5. Reihe', side: 'WS', text: plain },
            { label: '6. Reihe', side: 'RS', text: plain },
            { label: '7. Reihe', side: 'WS', text: plain },
          ],
        },
      ],
    },
    {
      title: 'Spitze',
      ref: { fileId: 1, page: 3, rect: { x: 0.05, y: 0.4, w: 0.9, h: 0.2 } },
      blocks: [
        {
          rows: [
            { label: '1. Reihe', side: 'RS', text: '2 re, Abn, 3 M abheben', stitchesAfter: 6 },
            { label: '2. Reihe', side: 'WS', text: '3 re, 3 M abheben' },
            { label: '3. Reihe', side: 'RS', text: 'wie 2. Reihe: 3 re, 3 M abheben' },
            { label: '4. Reihe', side: 'WS', text: 'wie 2. Reihe: 3 re, 3 M abheben' },
            { label: '5. Reihe', side: 'RS', text: 'wie 2. Reihe: 3 re, 3 M abheben' },
            { label: '6. Reihe', side: 'WS', text: 'wie 2. Reihe: 3 re, 3 M abheben' },
            { label: '7. Reihe', side: 'RS', text: 'abketten: 3 M re, 3 M li', stitchesAfter: 0 },
          ],
        },
      ],
    },
  ],
}
