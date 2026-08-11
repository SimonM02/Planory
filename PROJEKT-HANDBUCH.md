# Planory – Projekt-Handbuch (zentrale Übersicht)

> Diese Datei fasst alles Wichtige zum Projekt an einem Ort zusammen, damit
> nichts verloren geht – unabhängig vom Chat. Sie liegt dauerhaft auf GitHub.
> Stand: 11.08.2026.

## Was ist Planory?
Web-App + iPhone/iPad-App zur Verwaltung privater Bauprojekte (Hausbau,
Sanierung, Umbau): Budget, Baukosten, Rechnungen scannen, Angebote, Zeitplan,
Bautagebuch, Wartungsplan, Leitungen/Rohre, KI-Bauberater.

- **Web (live):** https://planory.at
- **Betreiber:** Simon Moser, Sportplatzstraße 18, 5222 Munderfing, Österreich
- **Kontakt:** moser.simon5211@gmail.com
- **Bundle-ID (App):** com.planory.bau · **Apple-ID:** 6779669289

## Wo liegt was? (dein „Tresor" = GitHub)
Repository: **github.com/SimonM02/Planory**
- `index.html` – die komplette App (Web). **Muss identisch sein mit `www/index.html`.**
- `www/index.html` – Kopie für die native App (immer byte-gleich halten!).
- `impressum.html`, `datenschutz.html` – Rechtstexte (live unter planory.at).
- `robots.txt`, `sitemap.xml`, `og-image.png` – SEO/Suchmaschinen.
- `OFFENE-PUNKTE.md` – aktuelle To-do-Liste.
- `ABO-IN-APP-SETUP.md` – Anleitung Apple-Abo (RevenueCat).
- `APP-STORE-TEXT.md` – fertige App-Store-Texte (DE/EN).
- `tests/pruefen.mjs` – Prüfskript (57 Checks), läuft vor jedem Hochladen.

## Wie funktioniert das Speichern/Veröffentlichen?
- **Zwei Zweige (Branches):**
  - `main` = die **LIVE-Web-Version** (planory.at, via GitHub Pages).
  - `claude/apple-feedback-changes-owr1go` = Arbeits-/Entwicklungszweig.
- **Jede Änderung ist ein „Commit"** und bleibt in der Historie gespeichert.
  Nichts wird je endgültig überschrieben – frühere Versionen sind wiederherstellbar.
- **Live schalten:** die App-Dateien vom Arbeitszweig nach `main` übernehmen,
  committen, pushen → GitHub Pages baut planory.at in 1–3 Min neu.

## Daten der Nutzer (App-Inhalte)
- Speicherung: **Supabase** (Datenbank + Login) und lokal im Gerät.
- Die App speichert automatisch (Funktionen `saveAll` → `syncToCloud`).
- Nutzer melden sich mit E-Mail an; Daten sind auf allen Geräten synchron.

## Preise / Bezahlen
- **Web:** Stripe. **App:** Apple In-App-Kauf (noch einzubauen, siehe unten).
- **Preis:** einheitlich (App = gleicher Kundenpreis wie Web). Apple behält 15 %
  ein (Small-Business-Programm) → etwas kleinere Marge, gleicher Preis.
- Aktuell: 1 Monat gratis testen, danach Abo. Konkreter Betrag noch offen.

## Wichtige offene Aufgaben (Details in OFFENE-PUNKTE.md)
1. **DRINGEND – Apple-Kategorie ändern** (blockiert die App-Freigabe):
   App Store Connect → Planory → App-Informationen → Kategorie **Primär** von
   „Kinder" auf **„Produktivität"** → Sichern → Build 7 erneut einreichen.
   Nur am Computer möglich. Kein neuer Build nötig. (Altersfreigabe steht auf 4+.)
2. **Google Search Console** einrichten → Verifizierungs-Code an Claude → Sitemap
   einreichen → Indexierung beantragen.
3. **Apple In-App-Abo** einbauen (erst nach Build-7-Freigabe; siehe ABO-IN-APP-SETUP.md).
4. **Preis** festlegen → in die Landing eintragen.
5. **„Im App Store laden"-Knopf** in die Landing, sobald App live + Store-Link da.

## Apple – Verlauf der Ablehnungen (zur Erinnerung)
- Abgelehnt wg. Guideline 1.3 „Kids Category". Ursache: die App war der
  **Kategorie „Kinder"** zugeordnet. Lösung = Kategorie auf „Produktivität"
  (siehe Punkt 1 oben). Die Altersfreigabe („Für Kinder gemacht") wurde bereits
  korrekt auf 4+/„Nicht anwendbar" gestellt.

## Landing-Page (planory.at, vor der Anmeldung)
- Öffentliche Startseite mit Menü (Funktionen/Preise/FAQ), zweisprachig (DE/EN,
  Umschalter oben rechts), immer im dunklen Design.
- Nur im Web sichtbar; angemeldete Nutzer und die native App überspringen sie.

---

## So sicherst du diesen Chat / dieses Wissen
- **GitHub ist das Backup.** Solange dein GitHub-Konto (SimonM02) besteht, ist
  alles hier Gespeicherte dauerhaft vorhanden – inklusive aller früheren Versionen.
- Diesen Chat in Claude **nicht löschen/archivieren**; du kannst ihn umbenennen
  oder anpinnen, damit du ihn wiederfindest.
- Wenn du je einen neuen Chat startest: einfach diese Datei (`PROJEKT-HANDBUCH.md`)
  öffnen lassen – dann ist der neue Assistent sofort im Bild.
