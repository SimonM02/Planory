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
`node tests/todoist-api.mjs` · `node tests/app-version-api.mjs` · `node tests/website.mjs`.
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
- **Supabase (15.11.2026):** Pro-Abo 25 $/Monat, darin 10 $ Guthaben für EINEN Server. Jedes weitere Projekt
  kostet extra (~10 $) – deshalb kein zweites Projekt mehr anlegen (Testprojekt „buildora-staging“ gelöscht).
- **Wo sieht man Abos?** Alle zusammen in der Supabase-Ansicht **`abo_uebersicht`** (Table Editor): Web-Abos aus
  `subscriptions` (Stripe) und iPhone-Abos aus `apple_subscriptions` (seit 15.11.2026 aus RevenueCat gespiegelt).
  - Spiegeln macht `api/abo-status.js?hook=revenuecat` (RevenueCat-Webhook, Code in Vercel `RC_WEBHOOK_AUTH`; ohne
    Code gesperrt). Jedes Ereignis löst nur einen Abgleich aus – der Stand kommt direkt von RevenueCat. Ereignis
    `TEST` („Send test event“) gleicht alle Konten ab (Nachtragen). Die Web-Prüfung spiegelt nebenbei mit.
  - **Über den Zugang entscheidet weiter RevenueCat/Stripe direkt** – `apple_subscriptions` ist nur die Übersicht.
  - Die „App User ID“ in RevenueCat ist die Supabase-User-ID. Solange Simon den Webhook nicht eingerichtet hat
    (siehe `OFFENE-PUNKTE.md`), stehen Apple-Abos nur in RevenueCat.
  - Keine neue Datei im Ordner `api/`: dort liegen 12 Funktionen (Grenze im kleinsten Vercel-Paket).
- **Entscheidungen:** Testzeitraum bleibt 30 Tage (Neubewertung nach 2–3 Monaten mit echten
  Zahlen) · keine eigene Erinnerungs-Mail der App (Stripe-Mail optional).

## 4. Wichtige Entscheidungen & Regeln (Verlauf)
- **Abmelden** meldet nur das eigene Gerät ab (`signOut({ scope: 'local' })`) – Konten werden
  teils von mehreren Personen geteilt. Nur „Konto löschen“ meldet alle Geräte ab.
- **Mehrere Personen:** v1.4 = Profile „Wer bin ich?“ im gemeinsamen Konto; später evtl.
  „Projekt teilen“ mit eigenen Logins.
- **Website (live seit 09.11.2026, Simons Wahl „Richtung A“):** hell im Bauplan-Stil (Papierton, Tinte, Orange
  nur als Akzent, Planraster/Plankopf), 5 Seiten: Start, Funktionen, Preise, Über Planory, Hilfe.
  Keine erfundenen Zahlen, Bewertungen oder Kundenstimmen; nur zeigen, was es in der App gibt.
  „Über Planory“ neutral: nur Vorname „Simon“, eigenes Bauprojekt als Anlass, kein Foto.
  Schriften (Archivo, IBM Plex Mono) liegen auf dem eigenen Server (DSGVO), nicht bei Google.
  „die einzige App“ wird bewusst nicht behauptet (Werberecht) – stattdessen „Eine App. Mehr brauchst du nicht.“
  **Clean (11.11.2026, Simons Wunsch):** kein Planraster, kein Plankopf, keine gezeichneten Handy-Rahmen mehr. App-Bilder
  sind echte Bildschirme als ruhige Karten (`.s-schirm`, oben angeschnitten). Überschriften: Zeilenabstand mind. 1,14,
  kein negativer Buchstabenabstand (Buchstaben standen sonst fast übereinander) – `tests/website.mjs` prüft das.
  **Kontaktdaten (10.11.2026):** Simon bekommt eine neue E-Mail und eine neue Adresse. Bis dahin stehen Mail/Adresse
  NUR im Impressum, in der Datenschutzerklärung und in den AGB (dort gesetzlich Pflicht); Website-Seiten verweisen
  aufs Impressum (`tests/pruefen.mjs` prüft das). Sobald die neuen Daten da sind: überall tauschen (Rechtstexte,
  `MAIL-VORLAGEN.md`, App/Einstellungen, App Store Connect).
  **Google:** Startseite hat WebSite- und Organization-Daten, Unterseiten Brotkrumen (BreadcrumbList). Die
  Unterseiten-Links unter „Planory“ in der Google-Suche (Sitelinks) wählt Google selbst – Sitemap in der Search
  Console einreichen und je Unterseite „Indexierung beantragen“.
- **Google:** Search Console bestätigt (Meta-Tag in `index.html` – nicht entfernen);
  Suchmaschinen bekommen immer die deutsche Startseite; Favicon als echte Dateien.
- **Supabase-Schlüssel** nur einmal im Code (`SUPA_KEY`) – ein alter, fest eingetragener
  Schlüssel hatte Web-Erinnerungen mit 401 scheitern lassen.
- **Meldungen** (Toasts) liegen über allen Fenstern; Fälligkeiten als ruhiges Kärtchen
  „Demnächst fällig“ (einmal pro Tag), keine Warn-Optik.
- **Ladebildschirm:** Logo baut sich auf (Kran → Haus → Dach).
- **Ladeanzeige (11.2026):** alles, was dauert, zeigt dieselbe kleine Karte unten: `_lade(text, gesamt)` mit Zähler
  („Fotos werden hochgeladen – 2 von 5“) bzw. `_mitLade(text, fn)` für unbekannte Dauer. Neue Uploads immer damit.
- **Angebote mit mehreren Anhängen (11.2026):** `a.dateien = [{name,type,url,path}]` (max. 10 Fotos/PDFs). `a.datei`
  bleibt als ERSTER Anhang mitgeschrieben, weil die iPhone-App v1.3 nur `datei` kennt. Immer über `_angDateien(a)`
  lesen (versteht alte Angebote und den Fall „alte App hat den Anhang ersetzt“).
- **Kategorie-Mappe (11.2026):** „📁 Mappe“ (Ausgaben-Seite, Filterzeile, Budget → Kategorie) erzeugt ein PDF je
  Kategorie: Deckblatt, Übersicht, jeder Beleg als Seite (PDF-Belege über pdf.js als Bild), Angebote + Anhänge,
  Zahlungstermine, Mängel, Fotos gleichnamiger Kategorie. Code: `_mappeDaten`, `_mappePDF`, `mappeErstellen`.
  Bleibt wie alle Exporte auch im Nur-Lesen-Modus möglich.
- **Doppelte Rechnung (15.11.2026):** Beim ANLEGEN einer Ausgabe (von Hand, KI-Scan, Angebot umwandeln) fragt die
  App nach, wenn es schon eine Ausgabe mit genau demselben Bruttobetrag gibt (`_kostenDoppelt`, `_doppeltFragen`):
  „Abbrechen“ / „Trotzdem speichern“. Beim Umwandeln eines Angebots zusätzlich „Nur Angebot abschließen“ –
  hakt das Angebot ab, ohne die Rechnung ein zweites Mal zu buchen. Nie beim Bearbeiten. Anlass: Testkonto hatte
  dieselbe Rechnung einmal gescannt und einmal aus dem Angebot umgewandelt. `showConfirm` kann dafür einen
  dritten Knopf (`extraText` → Ergebnis `'extra'`).
- **Angebots-Versionen (im Web live seit 15.11.2026, iPhone mit v1.4):** nachverhandelt → „＋ Neue Version“ im Angebot. Der aktuelle
  Stand steht wie bisher direkt am Angebot (Liste, Vergleich, „Zu Rechnung“, iPhone v1.3 rechnen automatisch mit der
  neuesten Version); frühere Stände in `a.versionen = [{nr, datum, gueltig, betrag, notiz, aenderung, dateien, ki?}]`,
  `a.aenderung` = „Was hat sich geändert?“. Jede Version behält ihre eigenen Anhänge (beim Anlegen einer neuen
  Version wird nichts aus der Ablage gelöscht). Liste zeigt „V2“ + Ersparnis gegenüber V1.
- **KI-Vergleich der Versionen:** `angVersionenKI` schickt die Anhänge der vorigen und der aktuellen Version an die KI
  (`claude-sonnet-4-6`, höchstens 8 Anhänge je Version – z. B. 8 fotografierte Seiten, ab 5 Bildern kleiner gerechnet; zusammen ca. 3,8 MB, sonst PDF-Seiten als Bilder; bei mehr Anhängen Hinweis im Ergebnis) und zeigt
  „Weggefallen / Neu dazugekommen / Preis geändert / Sonstiges“. Ergebnis wird am Angebot gespeichert
  (`a.kiVergleich`) – nochmal ansehen kostet nichts, „Neu vergleichen“ fragt neu. Text der KI nie als HTML einsetzen.
  `api/ki.js` hat dafür `maxDuration: 60`.
- **KI-Vergleich frei wählbar (16.11.2026):**
  - Versionen: ab 3 Versionen im Ergebnisfenster „Vergleiche [V1] mit [V3]“. Ergebnisse je Paar in
    `a.kiVergleiche["1-3"]` (ältere Felder `a.kiVergleich` / `versionen[i].ki` werden weiter gelesen). Ein noch nicht
    verglichenes Paar braucht einen Klick auf „Jetzt vergleichen“ (kostet sonst nichts). Version löschen → alle
    Versions-Vergleiche des Angebots weg (Nummern verschieben sich).
  - Firmen: „✨ Angebote vergleichen“ (Angebote-Seite) bzw. „Mit KI vergleichen“ je Kategorie im Reiter „Vergleich“ →
    genau zwei Angebote mit Foto/PDF wählen (`angFirmenKI`). Ergebnis am Angebot mit der kleineren ID:
    `a.kiFirmen[ID des anderen]`. Angebot gelöscht → Eintrag weg. Die KI gibt bewusst KEINE Empfehlung, nur Unterschiede.
  - Gemeinsamer Unterbau: `_angKiAnfrage` (Größen-Grenze, Fehlermeldungen), Anzeige-Bausteine `_kivZeile/_kivBlock/_kivFuss`.
- **Benennung & Erklärtexte (16.11.2026, Simon):** Funktionen heißen NICHT „mit KI …“ (z. B. „Angebote vergleichen“,
  „Versionen vergleichen“). Die KI wird nur dort genannt, wo es um Transparenz geht (Hinweis vor der ersten Nutzung,
  „Die KI kann sich irren …“ unter dem Ergebnis, Datenschutz). Bei jeder neuen/geänderten Funktion mitziehen:
  Info-Feld der Seite (`PAGE_HINTS` + `PAGE_HINTS_EN`, dabei `PAGE_HINT_VER` erhöhen, damit es Nutzern einmal neu
  erscheint), Website (`site-quelle/seiten/funktionen.html`, `hilfe.html`, Preise-FAQ → `node site-quelle/bauen.mjs`)
  und – bei neuer KI-Nutzung – die Aufzählung in `datenschutz.html`.
  Erster Start: Willkommens-Kacheln (Onboarding-Schritt 0) und Kurzbeschreibung je Modul (`MODULES[].desc`, auch in
  den Einstellungen) ebenfalls aktuell halten. Seit 16.11.2026 haben alle Seiten ein Info-Feld (neu: Zeitplan,
  Helfer, Fotos, Grundrisse; korrigiert: Kostenaufteilung = wer hat wie viel bezahlt, Notizen bis 50 MB, Einstellungen).
- **iPhone-Widgets (16.11.2026, kommt mit v1.4):** App schreibt per Plugin `capacitor-widget-bridge` einen JSON-Datensatz
  (`_widgetDaten`: Schnellzugriff + Termine/Aufgaben, KEINE Beträge) in die App Group `group.com.planory.bauassistent`
  (Schlüssel `planoryWidget`), gebündelt 2 s nach `save()`, beim Dashboard und beim Zurückkehren; abgemeldet/Demo → leer.
  Widget-Code: `ios-widget/PlanoryWidgets.swift` (liegt NICHT im iOS-Projekt – Simon fügt ihn in Xcode ein, siehe
  `WIDGETS-EINRICHTEN.md`). Tippen → `planory://aktion/<key>` / `planory://seite/<seite>` → `_widgetLink` (nur feste
  Ziele, Sperren gelten). Neue Schnellzugriff-Aktion → im Swift-Code `symbolFuerAktion` ergänzen (pruefen prüft das).
- **Android ohne Play Store (16.11.2026):** `manifest.webmanifest` + `icon-512.png` → planory.at in Chrome installierbar.
  Installiert geöffnet (`_alsAppGestartet`: display-mode standalone, iPhone-Home-Bildschirm oder `?source=pwa`) startet
  Planory wie die iPhone-App direkt mit der Anmeldung statt der Website.
- **Android-App vorbereitet (18.11.2026):** Ordner `android/` (Capacitor, dieselbe `www/index.html`, Version 1.4),
  Anleitung `ANDROID-EINRICHTEN.md`, Store-Texte `PLAY-STORE-TEXT.md`. Regeln:
  - **Nicht veröffentlichen ohne Google-Abo** (`RC_API_KEY_ANDROID` leer bedeutet, alles ist gratis).
  - In der App gibt es keinen Stripe-Kauf (Google-Regel).
  - **Push auf Android erst mit Firebase** (`ANDROID_PUSH_AKTIV`). Ohne `google-services.json` stürzt
    `register()` ab.
  - Zurück-Taste über `_androidZurueck()`. Die Abo-Sperre wird dabei nie weggetippt.
  - Keine Vollzugriff-Fotoberechtigung (Google-Richtlinie), nur die System-Foto-Auswahl.
  - Upload-Schlüssel (`*.jks`) nie ins Repo.
- **Live im Web seit 20.11.2026 (iPhone mit v1.4):**
  - Beträge mit Tausenderpunkt: Geldfelder sind Textfelder, gelesen mit `_betragFeld`/`_parseBetrag`.
  - KI-Hinweis kurz und einmal pro Konto (`user_metadata.kiHinweis`).
  - Tastatur: Esc schließt die oberste Ansicht (`_obersteSchliessen`). Enter löst den einzigen Haupt-Knopf
    eines Fensters aus. Bei roten Knöpfen (Löschen/Verwerfen) reicht Enter nie.
- **Live im Web seit 15.11.2026:** Ladeanzeige, mehrere Anhänge bei Angeboten, Kategorie-Mappe, Rückfrage bei
  doppelter Rechnung. iPhone: mit v1.4.

## 5. Datenschutz – Regeln für die Arbeit
- **Speicher `uploads` ist öffentlich** (Belege, Angebots-Anhänge, Fotos: Link öffnet ohne Anmeldung). Umbau auf privat
  ist geplant (`OFFENE-PUNKTE.md` Punkt 10a). Links aus Kundendaten nur Simon im Chat zeigen, nie in Dateien/Commits.
- **Simons Anfrage zu einem bestimmten Kunden = Support-Anlass:** direkt nachschauen und alles
  zeigen, was er zum Kontrollieren braucht – ohne Rückfrage. Ohne Anlass nicht in Kundendaten
  stöbern, sonst nur Gesamtzahlen.
  So geht's: Konto in `auth.users` über Name/E-Mail finden · Projekt, Adresse, Einstellungen in
  `projektdaten` (`typ='all_projects'`, `daten->'projects'`) · Einträge in `projekt_items`
  (`item_type`, `payload`, `deleted`).
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
- `marketing/` – Instagram-Prompt & Bilder.
- **Website** (`planory.at`, `/funktionen/`, `/preise/`, `/ueber/`, `/hilfe/`):
  **Texte nie direkt in den fertigen Seiten ändern**, sondern in `site-quelle/`
  (`seiten/<name>.html` = Inhalt, `teile/kopf.html` + `teile/fuss.html` = Kopf/Fuß für alle Seiten),
  danach `node site-quelle/bauen.mjs`. Das schreibt die Unterseiten, die Startseite in `index.html` +
  `www/index.html` (zwischen `WEBSITE:START/END`) und Kopf/Fuß von Impressum/Datenschutz/AGB (deren Text
  steht zwischen `RECHT:START/END` und bleibt unverändert). `support.html` leitet auf `/hilfe/` weiter
  (App-Store-Support-Link). Aussehen: `site/site.css` (alle Regeln unter `.pl-site`, wird in der App
  erst beim Anzeigen der Startseite geladen), Sprache/Menü: `site/site.js`. Englisch über `data-en`.
  App-Bilder: `node site-quelle/screens.mjs` (Demo „Musterhaus Graz“ + Beispieldaten → `site/img/*.webp`).
  Unterseiten verlinken auf `/?start=register` bzw. `/?start=login` (öffnet in der App direkt das Formular).
  Test: `node tests/website.mjs`; `tests/pruefen.mjs` prüft, ob alles neu gebaut ist.
- `marketing/planory-reel.mp4` – Instagram-Reel (16,5 s, 1080×1920) mit eigenen Soundeffekten
  (`reel/sound.cjs`, selbst erzeugt, −14 LUFS; Musik legt Simon in Instagram leise darunter) +
  `reel-titelbild.jpg`. Schluss bewusst ohne Preis/Gratis-Hinweis: „Jetzt starten →“.
- `marketing/planory-reel-baustelle.mp4` – Reel 2 (17 s) mit echten Baustellen-Clips von Mixkit
  (nur „Free License“ – Werbung erlaubt; Liste + Prüfdatum in `marketing/reel2/QUELLEN.md`, Clips
  selbst nicht im Repo). Bauen: `bash marketing/reel2/bg.sh`, dann `REEL_PAGE=reel2/reel2.html
  REEL_DUR=17 node marketing/reel/render.cjs full …`. Gemeinsame Bausteine: `reel/common.js`, `reel/sfx.cjs`.
- **Musterprojekt „Musterhaus Graz“ in Simons Konto** (seit 09.11.2026, zum Herzeigen der App): alle Bereiche
  gefüllt, Daten = Demo-Projekt + Beispieldaten aus `site-quelle/screens.mjs`. Fotos, Belege, Muster-PDFs und
  Grundriss liegen als Dateien unter `site/muster/` (planory.at/site/muster/…, in `robots.txt` gesperrt); im
  Projekt stehen nur Links. Eingetragen direkt in Supabase (`projektdaten.daten.projects` + `projekt_items`,
  Projekt-ID 1794216386717). Neu anlegen/aktualisieren: Claude bitten (Termine sind relativ zu „heute“ gebaut).
- `marketing/serie/` – Instagram-Serie „Planory erklärt“ (eine Funktion pro Folge, Di + Fr). Plan, Termine
  und Beschreibungstexte in `marketing/serie/PLAN.md`; Folgen als Daten in `folgen.js`, echte App-Bildschirme
  per `screens.mjs` (Demo-Modus). Reel 3 (KI-Fotos, Higgsfield) wartet auf Freigabe der Domain
  `d8j0ntlcm91z4.cloudfront.net`.
  Quelle: `marketing/reel/` (`reel.html` mit `render(t)`, `render.cjs` = Playwright, Bild für Bild).
  Video bauen: 4 Teilbilder pro Bild rendern, dann
  `ffmpeg -framerate 120 -i f_%05d.png -vf "tmix=frames=4,select='eq(mod(n\,4)\,3)',setpts=N/30/TB" -r 30 …`
  (= Bewegungsunschärfe), danach 2-Pass ca. 9 Mbit/s → ~17 MB.

## 7. Offen & laufend (Kurzfassung – Details in `OFFENE-PUNKTE.md`)
- v1.3 bei Apple in Prüfung → danach testen (Gratismonat, Kauf, Wiederherstellen).
- ✅ Neue Website (5 Seiten) live seit 09.11.2026.
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
