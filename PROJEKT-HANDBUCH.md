# Planory – Projekt-Handbuch (zentrale Übersicht)

> Das Gedächtnis des Projekts – unabhängig von jedem Chat. Liegt dauerhaft auf GitHub
> (mit allen früheren Versionen). Ein neuer Chat liest zuerst `CLAUDE.md`, dann diese Datei,
> dann `OFFENE-PUNKTE.md` – und ist im Bild. **Stand: 29.10.2026.**
> Keine Kundendaten (E-Mails, Inhalte) in diese oder andere Projektdateien schreiben.

## 1. Was ist Planory?
Web-App + iPhone/iPad-App für private Bauprojekte (Hausbau, Sanierung, Umbau): Budget & Kosten,
Rechnungen scannen (KI), Angebote, Zahlungsplan, Zeitplan, Aufgaben (Kategorien, Unteraufgaben,
„Heute/Kommende Tage“), Bautagebuch, Fotos, Pläne/Leitungen, Wartung, Helfer, Mängel, KI-Bauberater.
- **Web:** https://planory.at · **App:** „Planory - Bauassistent“ (`com.planory.bauassistent`)
- **Betreiber:** Simon Moser, 5222 Munderfing, Österreich (Kontakt siehe `impressum.html`)

## 2. Technik in Kürze
| Teil | Wo | Hinweis |
|---|---|---|
| App (komplett) | `index.html` | eine Datei; **`www/index.html` muss byte-gleich sein** (`cp`, `cmp`) |
| iPhone-App | Capacitor 8, bündelt `www/` | Änderungen kommen nur mit neuem Build aufs iPhone (Mac + Xcode) |
| Daten & Login | Supabase (EU) | Tabelle `projekt_items`: ein Eintrag = eine Zeile; Löschen setzt Grabstein (`_trackDeletion`) |
| Server-Funktionen | Vercel, Projekt „bauplan“ (`bauplan-weld.vercel.app`), Ordner `api/` | KI (`ki.js`), Stripe (`stripe-checkout/-webhook/-portal`), `abo-status` (Apple-Abo im Web), `app-version`, Push, Todoist |
| Website | GitHub Pages aus `main` | `_config.yml` hält interne Dateien raus; Umzug zu Vercel geplant (s. 7) |
| Abo Web | Stripe | Kundenportal zum Kündigen |
| Abo iPhone | Apple + RevenueCat (Berechtigung „Planory Pro“) | Einführungsangebot „1 Monat gratis“ in App Store Connect |
| KI | Anthropic (Claude) über `api/ki.js` | Hinweis vor erster Nutzung; Datenschutz beschreibt es |

**Zweige:** `main` = LIVE. `claude/apple-feedback-changes-owr1go` = Entwicklung.
**Live stellen:** auf dem Dev-Zweig testen → `main` auschecken → nur die geänderten Live-Dateien
(`index.html`, `www/index.html`, ggf. `api/…`, Rechtstexte, Bilder) übernehmen → commit → push.
Vercel baut den Dev-Zweig zusätzlich als Vorschau (Link in der Vercel-Übersicht).

**Tests (vor jedem Live-Stellen, alle grün):**
`node tests/pruefen.mjs` · `node tests/mobile-e2e.mjs` · `node tests/sync-e2e.mjs`
(bei Speichern/Sync) · `node tests/abo-api.mjs` · `node tests/push-api.mjs` ·
`node tests/todoist-api.mjs` · `node tests/app-version-api.mjs`.
Browser-Tests nie über `file://` (sonst Demo-Modus ohne Login).

## 3. Abo-Modell (Stand 21.10.2026)
- **Preise:** 3,99 €/Monat oder 28,99 €/Jahr (≈ 2,42 €/Monat, „40 % günstiger“).
- **Neue Konten ab 21.10.2026** (`PROBEABO_AB` in `index.html` **und** `api/stripe-checkout.js`):
  Gratismonat nur als **Probeabo** – 30 Tage gratis (Web: Stripe-Testzeitraum, Karte nötig;
  iPhone: Apple-Einführungsangebot 1 Monat), danach automatisch bezahlt, vorher kündbar.
  Ohne Abo: Fenster „Starte deinen Gratismonat“ (Jahresabo vorausgewählt) oder nur die Demo.
- **Kein zweiter Gratismonat:** Server prüft frühere Stripe-Abos (auch ohne Supabase-Zeile) und
  Apple-Abos (RevenueCat); läuft schon ein Abo → kein zweites.
- **Abo beendet** (neues Konto, hatte schon ein Abo) → **Nur-Lesen**, Daten bleiben sichtbar.
- **Ältere Konten (vor 21.10.):** Gratismonat ab Registrierung ohne Karte, danach Nur-Lesen.
- Abhaken von Aufgaben/Wartungen bleibt immer frei (`toggleTask` ohne `requireSub`).
- **Entscheidungen:** Testzeitraum bleibt 30 Tage (Neubewertung nach 2–3 Monaten mit echten
  Zahlen) · keine eigene Erinnerungs-Mail der App (Stripe-Mail optional).

## 4. Wichtige Entscheidungen & Regeln (Verlauf)
- **Abmelden** meldet nur das eigene Gerät ab (`signOut({ scope: 'local' })`) – Konten werden
  teils von mehreren Personen geteilt. Nur „Konto löschen“ meldet alle Geräte ab.
- **Mehrere Personen:** v1.4 = Profile „Wer bin ich?“ im gemeinsamen Konto; später evtl.
  „Projekt teilen“ mit eigenen Logins.
- **Startseite:** dunkel, sachlich, keine erfundenen Zahlen/Bewertungen; neue Fassung mit
  echten App-Bildern (`lp/`) liegt auf dem Dev-Zweig, geht nach Simons OK live.
- **Google:** Search Console bestätigt (Meta-Tag in `index.html` – nicht entfernen);
  Suchmaschinen bekommen immer die deutsche Startseite; Favicon als echte Dateien.
- **Supabase-Schlüssel** nur einmal im Code (`SUPA_KEY`) – ein alter, fest eingetragener
  Schlüssel hatte Web-Erinnerungen mit 401 scheitern lassen.
- **Meldungen** (Toasts) liegen über allen Fenstern; Fälligkeiten als ruhiges Kärtchen
  „Demnächst fällig“ (einmal pro Tag), keine Warn-Optik.
- **Ladebildschirm:** Logo baut sich auf (Kran → Haus → Dach).

## 5. Datenschutz – Regeln für die Arbeit
- **In Kundendaten nur mit Grund schauen** (Support-Anfrage, Fehlersuche) – sonst nur
  Gesamtzahlen. Inhalte (Beträge, Texte) nur auf ausdrücklichen Wunsch des Kunden.
- **Keine Kundendaten in Projektdateien/Commits** – das Repo ist (noch) öffentlich. Prüfung
  `tests/pruefen.mjs` schlägt bei fremden E-Mail-Adressen in `.md`-Dateien an.
- Verzeichnis der Verarbeitungstätigkeiten + Vertrags-Checkliste: `VERARBEITUNGSVERZEICHNIS.md`.
- Datenschutzerklärung nennt alle Dienste inkl. Drittland (USA); `privacy.html` leitet weiter.

## 6. Wo liegt was?
- `OFFENE-PUNKTE.md` – **To-do-Liste** (oben „Jetzt zu tun“).
- `NAECHSTER-BUILD-v1.3.md` – Schritt-für-Schritt iOS-Upload (Vorlage für künftige Builds).
- `APP-STORE-TEXT.md` – App-Store-Texte DE/EN · `ABO-IN-APP-SETUP.md` – Apple-Abo/RevenueCat.
- `NATIVE-PUSH-SETUP.md` – Push · `MAIL-VORLAGEN.md` – Mail-Texte · `SYNC-FINDINGS.md` – Sync-Wissen.
- `agb.html`, `datenschutz.html`, `impressum.html`, `support.html` – Rechtliches/Support (live).
- `marketing/` – Instagram-Prompt & Bilder · `lp/` – Bilder der neuen Startseite.

## 7. Offen & laufend (Kurzfassung – Details in `OFFENE-PUNKTE.md`)
- v1.3 bei Apple in Prüfung → danach testen (Gratismonat, Kauf, Wiederherstellen).
- Neue Startseite: wartet auf OK.
- GitHub-Projekt privat machen: Website zu Vercel (Domain-Anbieter klären), vorher
  Datenschutz-URL in App Store Connect auf `https://planory.at/datenschutz.html`.
- Stripe-Kundenportal: Kündigen „am Ende des Zeitraums“.
- Rechtlich prüfen lassen: AGB, Datenschutz, Widerrufs-Button (§ 13a FAGG).

## 8. So sicherst du dieses Wissen
- **GitHub ist das Backup.** Alles hier liegt dauerhaft mit allen Versionen auf GitHub
  (Konto SimonM02). Am besten **Zwei-Faktor-Anmeldung** bei GitHub einschalten.
- **Zweite Kopie:** Der Planory-Ordner auf deinem Mac ist eine vollständige Kopie. Mit
  `git pull origin claude/apple-feedback-changes-owr1go` ist er auf dem neuesten Stand.
- **Den Chat** nicht löschen – du kannst ihn umbenennen/anpinnen. Wird er sehr lang, fasst
  Claude ältere Teile automatisch zusammen; das Wichtige steht trotzdem hier.
- **Neuer Chat:** „Lies CLAUDE.md, PROJEKT-HANDBUCH.md und OFFENE-PUNKTE.md“ – fertig.
- Nach größeren Entscheidungen: Claude bitten, sie hier einzutragen.
