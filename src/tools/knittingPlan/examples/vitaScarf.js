// Strickplan nach einer echten Anleitung: „Vita Scarf“ (le knit).
// Texte gekürzt und umformuliert (Urheberrecht, siehe sophieScarf.js).
//
// Typ: Strickschrift statt ausgeschriebener Reihen, drei Größen (A/B/C),
// Länge in „Mustern in der Höhe“ statt in Reihen.
//
// Aus dem Diagramm (S. 4) ausgezählt, per Pixelanalyse der Rasterlinien:
// - 30 Diagrammreihen, Hin- und Rückreihen sind beide eingezeichnet
//   (Legende „re in Hin-R, li in Rück-R“).
// - Reihe 1–18: Anfang unter der unteren dicken Linie (einmal).
// - Reihe 19–28: Rapport zwischen den dicken Linien = ½ Muster.
// - Reihe 29–30: Ende („Ende, wie es das Diagramm vorgibt“).
// Ein Muster in der Höhe sind 20 Reihen; der Anfang zählt mittig als
// 1 Muster. 6½ Muster (A/B) = 18 + 11·10 + 2 = 130 Reihen,
// 4½ Muster (C) = 18 + 7·10 + 2 = 90 Reihen.
// Die Zuordnung „Anfang = 1 Muster“ ist aus dem Diagramm abgeleitet,
// nicht ausdrücklich in der Anleitung genannt.

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
      // Diagramm auf S. 4, auf der Seite um 90° gedreht abgedruckt.
      ref: { fileId: 2, page: 4, rect: { x: 0.1, y: 0.15, w: 0.32, h: 0.74 } },
      blocks: [
        {
          ref: { fileId: 2, page: 3, rect: { x: 0.1, y: 0.1, w: 0.8, h: 0.05 } },
          rows: [{ label: '1. Reihe', text: 'Rück-R: Muster einteilen (li/re laut Anleitung)' }],
        },
        {
          note: 'Anfang des Diagramms',
          chart: { from: 1, to: 18 },
        },
        {
          note: 'Rapport zwischen den dicken Linien wiederholen',
          repeat: { A: 11, B: 11, C: 7 },
          chart: { from: 19, to: 28 },
        },
        {
          note: 'Ende des Diagramms',
          chart: { from: 29, to: 30 },
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
