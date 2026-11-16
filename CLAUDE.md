# Strick-App

Ich entwickle eine Strick-App für mein iPhone, die mir hilft, bei Maschen und
Reihen nicht durcheinanderzukommen. Ich studiere Software Engineering,
erkläre Code also auf Studierenden-Niveau, aber ohne Grundlagen zu wiederholen.
Antworte auf Deutsch.

## Technik
- React mit Vite (JavaScript), als PWA umgesetzt (vite-plugin-pwa)
- Läuft auf dem iPhone über Safari → „Zum Home-Bildschirm“
- Daten lokal speichern mit IndexedDB (Dexie), offline nutzbar
- Hosting über GitHub Pages
- Mobile-first: große Buttons, einhändig bedienbar, Display soll anbleiben
- Möglichst wenige Bibliotheken; neue Abhängigkeiten kurz begründen

## Architektur
- Jedes Tool liegt in einem eigenen Ordner unter src/tools/
- Alle Tools werden in src/tools/toolRegistry.js eingetragen
- Projekte unter src/projects/, Datenspeicherung unter src/data/
- Ein neues Tool darf möglichst keine Änderungen an anderen Tools erfordern

## Funktionen (MVP)
- Mehrere Strickprojekte anlegen, umbenennen, löschen
- Reihenzähler und Maschenzähler mit +/− und Rückgängig
- Rapport-/Wiederholungszähler
- Notizen pro Projekt bzw. Reihe
- Anleitung (PDF oder Foto) an ein Projekt anhängen
- Markierung der aktuellen Zeile in der Anleitung

## Roadmap
Erledigte Punkte hier abhaken, sobald der zugehörige Pull Request gemergt ist.
- [x] 1. Deployment auf GitHub Pages + PWA (auf dem iPhone installierbar)
- [ ] 2. Maschenzähler
- [ ] 3. Rapport-/Wiederholungszähler
- [ ] 4. Notizen
- [ ] 5. Anleitung anhängen (PDF/Foto)
- [ ] 6. Zeilenmarkierung in der Anleitung

## Git-Workflow
- Für jede neue Funktion einen eigenen Branch (feature/…, fix/…, refactor/…)
- Commit-Messages nach Conventional Commits (feat:, fix:, refactor:, chore:)
- Vor jedem Commit npm run build ausführen und sicherstellen, dass es läuft
- Nie direkt auf main pushen, ohne mich vorher zu fragen

## Arbeitsweise
- In kleinen Schritten arbeiten und vor größeren Umbauten nachfragen
- Am Ende jeder Aufgabe kurz zusammenfassen, was geändert wurde
- Design: Ich liefere Figma-Screenshots; ohne Vorlage schlicht und gut lesbar
