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
- Oberfläche im Standard-iOS-Look nach Apples Human Interface Guidelines:
  gruppierte Listen, Systemschrift, iOS-Dark-Mode. Farben aber aus dem Figma:
  Creme-Hintergrund, Lila als Tint, pro Tool ein Pastellton über die
  tone-*-Klassen in src/index.css (Reihe Flieder, Maschen Mint, Rapport
  Pfirsich, Notizen Butter); neue Tools bekommen einen eigenen Ton
- Perspektive: evtl. spätere Portierung zu SwiftUI. Deshalb fachliche Logik
  von React-Komponenten trennen (reine Funktionen pro Tool, siehe
  src/tools/rapportCounter/rapportLogic.js) und das Datenmodell schlank halten

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
- Anleitung (PDF oder Foto) an ein Projekt anhängen und ganz ansehen
- Geführtes Stricken: Die App versteht die Anleitung (KI-Import mit
  anschließender Korrektur durch mich) und zeigt anhand der Zähler immer
  die aktuelle Zeile an, inkl. Wiederholungen und Abschnittswechseln

## Strickplan (geführtes Stricken)
- Das Ganze muss für beliebige Anleitungen funktionieren. Einzelne
  Anleitungen (z. B. der Sophie Scarf) sind nur Testfälle: Nichts im
  Datenmodell, in der Logik oder im KI-Import darf auf eine bestimmte
  Anleitung zugeschnitten sein
- Endbedingungen, die die Zähler nicht kennen können (z. B. „bis 30 cm“),
  bestätige ich per Häkchen von Hand, genau wie den Anschlag
- Eine Anleitung wird beim Import in einen strukturierten Strickplan (JSON)
  übersetzt: Größen, Abschnitte (z. B. Anschlag, Zunahme, Abnahme), Reihen,
  Wiederholungen und Endbedingungen (z. B. „bis 28 Maschen“, „6× wiederholen“)
- Beim Import fragt die App: welche Größe ich stricke und ob ich die gerade
  gestrickte oder die fertige Reihe zähle
- Die aktuelle Zeile wird als reine Funktion aus Plan + Zählerständen
  berechnet (keine React-Abhängigkeit, mit Tests)
- KI-Import über die Claude-API: Es gibt keinen eigenen Server, daher hinterlege
  ich meinen eigenen API-Schlüssel in der App; er bleibt nur auf dem Gerät.
  Nur der Import braucht Internet, danach läuft alles offline
- Die KI kann sich irren: Den erzeugten Plan prüfe und korrigiere ich, bevor
  er benutzt wird. Ein Plan lässt sich auch komplett von Hand anlegen

## Vorschau im iPhone-Simulator
In jeder Session, die an der App arbeitet, soll ich die Entwicklung live
verfolgen können:
- Gleich zu Beginn das iPhone-Simulator-Panel öffnen (attach). Falls kein
  Gerät gebootet ist: zuerst `xcrun simctl boot "iPhone 17 Pro"` und mit
  `xcrun simctl bootstatus "iPhone 17 Pro"` auf den Boot warten.
- Dev-Server starten (npm run dev) und die App im Simulator-Safari öffnen:
  `xcrun simctl openurl booted http://127.0.0.1:<Port>` — wichtig: 127.0.0.1,
  nicht „localhost“ (löst im Simulator nach IPv6 auf, Vite lauscht nur auf IPv4).
- Vite-HMR aktualisiert die Seite meist automatisch; nach größeren Umbauten
  die Seite im Simulator neu laden.
- Läuft bereits eine andere Session mit dem Simulator, nicht dazwischenfunken:
  dann stattdessen das Browser-Panel mit mobilem Viewport nutzen.

## Roadmap
Erledigte Punkte hier abhaken, sobald der zugehörige Pull Request gemergt ist.
- [x] 1. Deployment auf GitHub Pages + PWA (auf dem iPhone installierbar)
- [x] 2. Maschenzähler
- [x] 3. Rapport-/Wiederholungszähler
- [x] 4. Notizen
- [ ] 5. Anleitung anhängen und ansehen: PDF/Foto pro Projekt speichern,
      Vollansicht zum Blättern
- [ ] 6. Strickplan-Modell + Logik: Datenmodell und reine Funktionen, die aus
      Plan und Zählerständen die aktuelle Zeile berechnen (Wiederholungen,
      Endbedingungen, Größe, Zählweise), abgesichert mit Tests
- [ ] 7. Anleitungs-Tool im Projekt: Karte mit der aktuellen Zeile, Häkchen
      für den Anschlag, automatischer Sprung zur nächsten Zeile bzw. zum
      nächsten Abschnitt; Tipp auf die Karte öffnet die ganze Anleitung.
      Zunächst mit von Hand angelegten Beispielplänen (mehrere, möglichst
      unterschiedlich aufgebaute Anleitungen)
- [ ] 8. KI-Import: PDF/Foto per Claude-API in einen Strickplan übersetzen,
      beim Import Größe und Zählweise abfragen, Plan prüfen und korrigieren

## Git-Workflow
- Für jede neue Funktion einen eigenen Branch (feature/…, fix/…, refactor/…)
- Commit-Messages nach Conventional Commits (feat:, fix:, refactor:, chore:)
- Vor jedem Commit npm run build ausführen und sicherstellen, dass es läuft
- Nie direkt auf main pushen, ohne mich vorher zu fragen

## Arbeitsweise
- In kleinen Schritten arbeiten und vor größeren Umbauten nachfragen
- Am Ende jeder Aufgabe kurz zusammenfassen, was geändert wurde
- Design: Standard-iOS-Look nach Apple HIG; Figma-Screenshots von mir dienen
  als inhaltliche Orientierung (welche Elemente wohin), nicht als Pixel-Vorlage
