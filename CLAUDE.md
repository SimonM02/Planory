# Planory – Hinweise für Claude

## Arbeitsweise (vom Nutzer gewünscht)
So effizient, vollständig und korrekt wie möglich arbeiten:
- **Knapp antworten** – keine Wiederholungen, kein Ausschmücken; nur was gebraucht wird.
- **Token sparen:** nur relevante Dateiteile lesen, Änderungen bündeln, keine überflüssigen
  Tool-Aufrufe. Vollständigkeit & Korrektheit haben dennoch Vorrang.
- **Testen & sauber deployen** bleibt Pflicht – nur mit weniger „Drumherum".
- Nur nachfragen, wenn die Entscheidung wirklich dem Nutzer gehört.
- Bei Dingen, bei denen du dich nicht sicher auskennst: **nicht einfach machen, vorher fragen.**
- Antworten an Simon auf Deutsch, einfach und nicht technisch.

## Projekt-Fakten (Kurz)
- Ein-Datei-App: `index.html` == `www/index.html` (byte-identisch halten; `cmp` + `node tests/pruefen.mjs`).
- Speichern/Sync geändert? Zusätzlich `node tests/sync-e2e.mjs` (echte App + nachgebautes Supabase).
  Browser-Tests NIE über `file://` – ohne Hostnamen startet die App im Demo-Modus ohne Login/Cloud.
- iOS-App bündelt `www/` beim Build (kein `server.url`) → Fixes erreichen die App erst mit neuem Build.
- Dev-Branch: `claude/apple-feedback-changes-owr1go`. `main` = live (planory.at via GitHub Pages + Vercel-Backend).
- Web-Deploy: `main` auschecken → `index.html`/`www/index.html` von dev holen → committen → pushen.
- Backend im `api/`-Ordner (Vercel, deployt aus `main`).
- Commit-Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` + `Claude-Session: …`. Kein Modell-Name in Commits/Artefakten.
- **Zuerst lesen:** `PROJEKT-HANDBUCH.md` (Gedächtnis des Projekts: Technik, Abo-Regeln, Entscheidungen), dann `OFFENE-PUNKTE.md`.
- Wichtige neue Entscheidungen in `PROJEKT-HANDBUCH.md` nachtragen.
- Hat der Dev-Branch noch nicht freigegebene Änderungen (z. B. neue Startseite), beim Live-Stellen
  nicht die ganze `index.html` kopieren, sondern nur den Fix auf `main` anwenden.
- **Datenschutz:** In Kundendaten (Supabase) nur mit Grund schauen (Support/Fehlersuche, mit
  Einverständnis); sonst nur Gesamtzahlen. Keine Kundendaten in Dateien/Commits (Repo öffentlich).
- Offene Punkte: siehe `OFFENE-PUNKTE.md`.
