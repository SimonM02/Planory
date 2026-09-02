# Planory – Hinweise für Claude

## Arbeitsweise (vom Nutzer gewünscht)
So effizient, vollständig und korrekt wie möglich arbeiten:
- **Knapp antworten** – keine Wiederholungen, kein Ausschmücken; nur was gebraucht wird.
- **Token sparen:** nur relevante Dateiteile lesen, Änderungen bündeln, keine überflüssigen
  Tool-Aufrufe. Vollständigkeit & Korrektheit haben dennoch Vorrang.
- **Testen & sauber deployen** bleibt Pflicht – nur mit weniger „Drumherum".
- Nur nachfragen, wenn die Entscheidung wirklich dem Nutzer gehört.

## Projekt-Fakten (Kurz)
- Ein-Datei-App: `index.html` == `www/index.html` (byte-identisch halten; `cmp` + `node tests/pruefen.mjs`).
- Dev-Branch: `claude/apple-feedback-changes-owr1go`. `main` = live (planory.at via GitHub Pages + Vercel-Backend).
- Web-Deploy: `main` auschecken → `index.html`/`www/index.html` von dev holen → committen → pushen.
- Backend im `api/`-Ordner (Vercel, deployt aus `main`).
- Commit-Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` + `Claude-Session: …`. Kein Modell-Name in Commits/Artefakten.
- Offene Punkte: siehe `OFFENE-PUNKTE.md`.
