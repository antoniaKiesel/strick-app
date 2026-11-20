// Strickplan nach einer echten Anleitung: „Vita Scarf“ (le knit).
// Texte gekürzt und umformuliert (Urheberrecht, siehe sophieScarf.js).
//
// Typ: Strickschrift statt ausgeschriebener Reihen, drei Größen (A/B/C),
// Länge in „Mustern in der Höhe“ statt in Reihen.
//
// Noch unbestätigt (am Bildschirm aus dem Diagramm abgezählt):
// - Der Rapport zwischen den dicken Linien hat 10 Reihen = ½ Muster,
//   also 6½ Muster = 13 Rapporte (A/B) und 4½ Muster = 9 Rapporte (C).
// - Die Diagrammreihen vor dem Rapport und das Ende „wie es das
//   Diagramm vorgibt“ fehlen hier noch; die Nummerierung 1–10 bezieht
//   sich nur auf den Rapport.
// Für die Tests ist das egal: Sie prüfen die Struktur (Diagramm-Block,
// Größen-Map, abgeleitete Hin-/Rückseite), nicht die Strickanleitung.

export const vitaScarf = {
  version: 1,
  title: 'Vita Scarf',
  sizes: [
    { id: 'A', name: 'A (ca. 140 cm)' },
    { id: 'B', name: 'B (ca. 120 cm)' },
    { id: 'C', name: 'C (ca. 75 cm)' },
  ],
  values: {
    needle: { A: '5,5 mm', B: '4 mm', C: '4 mm' },
  },
  construction: 'flat',
  wsRows: 'listed',
  firstSide: 'WS',
  sections: [
    {
      title: 'Anschlag',
      blocks: [{ note: '19 M auf Nadel {needle} anschlagen' }],
    },
    {
      title: 'Muster',
      blocks: [
        {
          ref: { fileId: 2, page: 3, rect: { x: 0.1, y: 0.1, w: 0.8, h: 0.05 } },
          rows: [{ label: '1. Reihe', text: 'Rück-R: Muster einteilen (li/re laut Anleitung)' }],
        },
        {
          note: 'Rapport zwischen den dicken Linien wiederholen',
          ref: { fileId: 2, page: 4, rect: { x: 0.1, y: 0.15, w: 0.3, h: 0.73 } },
          repeat: { A: 13, B: 13, C: 9 },
          chart: { from: 1, to: 10 },
        },
      ],
    },
    {
      title: 'Abketten',
      blocks: [
        {
          ref: { fileId: 2, page: 3, rect: { x: 0.1, y: 0.22, w: 0.8, h: 0.08 } },
          rows: [{ label: 'Abkettreihe', text: 'Hin-R: im Muster abketten' }],
        },
      ],
    },
  ],
}
