# Offene Punkte / To-do (Planory)

Kurze Merkliste, damit wir nichts vergessen. Stand: 19.10.2026.

## Aktueller Stand (kurz)
- ✅ **App ist LIVE im App Store** – „Planory - Bauassistent" (`com.planory.bauassistent`).
- ✅ **Web (planory.at) ist live** und bekommt alle Fixes sofort.
- ✅ **Sicherheit gehärtet** (RLS `subscriptions`, Stripe-Webhook/Checkout, KI-Kostenschutz,
  XSS, DB-Funktionen) – Backend live.
- ✅ Im Web bereits live & für den nächsten iOS-Build bereit: **Helfer-Modul**,
  **Abo-Glückwunsch + Pro-Knopf**, **Landing-Preis**, **komplette DE/EN-Übersetzung**,
  **Eigenleistung-Fix**.

## 🔴 NÄCHSTER SCHRITT: iOS-Build v1.3 (Sammel-Update, alles geprüft)
Die iPhone-App läuft noch mit v1.2. Im Web (planory.at) sind seit 16.10.2026 alle Fixes live –
in die App kommen sie nur mit einem neuen Build. Stand Dev-Branch: alle Tests grün
(pruefen 96/96, mobile-e2e 72/72, sync-e2e 19/19, todoist-api 14/14, push-api 4/4).
- [ ] Mac: `git pull origin claude/apple-feedback-changes-owr1go` → **`npm install`** (neu: Teilen-
      und Dateien-Plugin für PDFs) → `npx cap sync ios` → Xcode:
      **Version 1.3**, Build +1 → Product → Archive → Distribute → Upload (Ablauf wie
      NAECHSTER-BUILD-v1.2.md; Info.plist-Kamera-Einträge sind schon drin).
- [ ] What's New (Vorschlag):
      „• Wichtige Fehlerbehebung: neue Einträge gehen nach dem Speichern nicht mehr verloren
       • Abbrechen und Bearbeiten zuverlässig – nichts wird mehr versehentlich überschrieben
       • Rechnung scannen: wird sofort eingebucht, Beträge wie 1.234,56 werden erkannt,
         PDF-Rechnungen bleiben PDF, verständliche Fehlermeldungen
       • „Bezahlt von": neue Person direkt beim Erfassen eintragen
       • NEU: Fotos direkt im Bautagebuch-Eintrag
       • NEU: Bautagebuch als Erinnerungs-Buch mit Fotos (PDF, Fotobuch oder A4)
       • PDFs lassen sich jetzt teilen, drucken und in Dateien sichern
       • Angebote, Zahlungsplan, Wartung und Budgetkategorien verbessert
       • Gelöschte Einträge bleiben gelöscht
       • Bessere Darstellung am iPhone (Tabellen, Wartung, Einstellungen)
       • Zeitplan neu: klarer aufgebaut, Status per Tipp, Punkte landen automatisch im passenden Abschnitt
       • Budget als Grafik · Startseite mit Schaltern für Beträge und KI-Berater
       • Ausgaben „nicht im Budget" (z. B. Eigenleistung) per Häkchen
       • Bautagebuch: Wetter per Antippen, keine störende Fehlermeldung mehr
       • Fotos zoomen · Dateien per Drag & Drop · Helfer-Stunden"
- [ ] Am iPhone prüfen: PDF-Beleg antippen (öffnet als PDF? zurück in die App möglich?) ·
      Bautagebuch → „📖 Buch" → Teilen-Menü erscheint → Drucken / „In Dateien sichern" ·
      ein Eingabefenster offen lassen und ☰ tippen (Fenster schließt, bei Eingaben Rückfrage) ·
      Zeitplan „+ Abschnitt" (springt zum neuen Abschnitt) · Bautagebuch „+ Eintrag" (Wetter-Felder).
- Hinweis: Alte Eigenleistungen werden beim ersten Öffnen mit der neuen Version automatisch zu
  Ausgaben „nicht im Budget" (einmalig; die alten Daten bleiben als Sicherung erhalten).
- [ ] Nach dem Update: die 3 seit 14.08. bearbeiteten Ausgaben (1 davon in Simons Konto) kurz auf
      die richtige MwSt prüfen (alter Fehler: MwSt vom letzten Bearbeiten blieb hängen).
- [ ] Später überlegen: Live-Updates (z. B. Capgo/Appflow) – dann kämen reine Web-Fixes ohne
      neuen App-Store-Build aufs iPhone.

## Todoist-Anbindung (Web) – Code fertig, Einrichtung bei Simon
- [ ] Todoist → Einstellungen → Integrationen → Entwickler (App Management Console): App
      **„Planory“** anlegen. „Todoist“ darf NICHT im Namen stehen. Weiterleitungs-Adresse
      (OAuth redirect URL): `https://bauplan-weld.vercel.app/api/todoist`. Client-ID + Client-Secret kopieren.
- [ ] Vercel → Projekt → Settings → Environment Variables (Production, „Sensitive“):
      `TODOIST_CLIENT_ID`, `TODOIST_CLIENT_SECRET`, `TODOIST_TOKEN_KEY` (Schlüssel macht Claude),
      danach neu ausrollen (Redeploy).
- [ ] Einmal selbst testen: Einstellungen → Todoist → verbinden → Projekt wählen → Aufgaben →
      eine Aufgabe abhaken → wieder trennen.
- [ ] Vor einer iPhone-Version mit Todoist: kurze schriftliche Bestätigung von Doist einholen
      (Apple-Richtlinie 5.2.2) – in der App ist Todoist bis dahin ausgeblendet.
- [x] Datenbank-Tabelle `todoist_verbindungen` angelegt (RLS an, nur Server-Zugriff).

## Authentifizierungs-E-Mails (Supabase) – Texte fertig, Einbau bei Simon
- [ ] „Confirm signup" + „Reset password" (+ übrige) ins **Supabase → Authentication →
      Email Templates** einfügen (Texte in MAIL-VORLAGEN.md).
- [ ] Absendername in Supabase auf **„Planory"** setzen (statt „Supabase Auth").
- [ ] **„Leaked Password Protection" aktivieren** (Supabase → Authentication → Policies) –
      kleiner Klick, mehr Sicherheit. (Nur im Dashboard möglich.)

## Landing-Page (live auf planory.at)
- [x] **Preis eingetragen** (3,99 €/Monat · 28,99 €/Jahr) – im Preis-Abschnitt und in der FAQ.
- [ ] **„Im App Store laden"-Knopf** ergänzen → dazu den **App-Store-Link** an Claude schicken.

## SEO / Google-Sichtbarkeit
- [ ] **Google Search Console** einrichten (search.google.com/search-console →
      Property `https://planory.at` → HTML-Tag-Code **an Claude schicken** → einbauen →
      bestätigen → Sitemap `sitemap.xml` senden → Indexierung beantragen).
- [ ] Backlinks: planory.at in Instagram-Bio + App-Store-Eintrag hinterlegen.

## Android-Version (Play Store) – NACH iOS läuft
- [ ] Google-Play-Entwicklerkonto (~25 $ einmalig).
- [ ] `npx cap add android` → Build aus derselben `www/index.html`.
- [ ] Abo: Google Play Billing + in RevenueCat als Google-Produkte ergänzen.
- [ ] **Kleiner Code-Eingriff:** RevenueCat-Schlüssel je Plattform (iOS `appl_…` /
      Android `goog_…`) – Claude macht die Weiche.

## ✅ Erledigt (zur Info)
- [x] **Helfer-Modul** (Kalender, Einteilung, offene Plätze, Erinnerung, Bautagebuch-Übernahme).
- [x] **Abo-Glückwunsch-Dialog + „⭐ Planory Pro"-Knopf** in der Seitenleiste.
- [x] **Komplette DE/EN-Übersetzung** – Menüs, Dialoge, Meldungen, Formularfelder, Landing;
      per Audit über die ganze App verifiziert (0 deutsche Reste im EN-Modus).
- [x] **Fix:** „Eigenleistung speichern" war kaputt – behoben.
- [x] **DB-Sicherheit:** `handle_new_user` + `rls_auto_enable` gehärtet (kein öffentlicher
      RPC, fixer `search_path`) – Trigger laufen unverändert.
- [x] **Storage-Bucket `uploads`** existiert & public geprüft (`dokumente` korrekt privat).
- [x] **Freigabe-Liste** (`.claude/settings.json`) für weniger Bestätigungs-Nachfragen.
- [x] Kamera-Foto-Verarbeitung speicherschonend/fehlertolerant; nativer Foto-Picker mit
      sicherem Fallback (Plugin optional).

## Mit Marie besprechen (Tester-Feedback, noch offen)
- [ ] **Zeitplan „oben/unten Aufgaben nicht abgrenzbar"** – vermutlich Phasen vs. Sammelblock
      „Weitere Punkte" (dort landen Einträge aus altem Meilenstein-Dialog + KI-Import ohne Phase).
- [ ] **Bautagebuch vs. Helfer** – „Arbeiter & Stunden" doppelt? (Tagebuch übernimmt jetzt die
      Helfer inkl. Stunden automatisch). Tagebuch evtl. reiner Text-Bericht?
- [ ] **Notizen & Dokumente ≈ Bautagebuch** – Zweck klarer trennen (Notizen = To-dos/Gespräche,
      Tagebuch = was auf der Baustelle passiert ist).
- [ ] Zurückgestellte Wünsche: Angebote → Budgetkategorien, mehrere Fotos je Tagebuch-Tag
      (heute kommen Galerie-Fotos mit gleichem Datum ins Buch), Tagebuch-Kategorien/Filter.
- [x] Bautagebuch-Buch (PDF mit Fotos) – erledigt; Ideen dazu: Titelbild selbst wählen,
      eigene Schrift, Vorschau in der App.

## Technik – später verbessern (bekannt, kein akuter Fehler)
- [x] **Sicherheit (19.10.2026 behoben):** `push-subscribe`, `native-token-register`, `push-test`
      und `stripe-portal` lasen die Nutzer-ID nur aus dem Login-Token, ohne es zu prüfen – mit
      einem gefälschten Token hätte man u. a. das Stripe-Kundenportal eines fremden Kontos öffnen
      können. Jetzt prüft Supabase jedes Token (`api/_auth.js`), Test `tests/push-api.mjs`.
- [ ] `privacy.html` ist veraltet (info@planory.app) und evtl. noch im App Store verlinkt →
      auf `datenschutz.html` umleiten oder aktualisieren.
- [ ] Rechtlich prüfen lassen: Widerrufs-Button („Vertrag widerrufen“, § 13a FAGG seit
      01.10.2026) und AGB/Widerrufsbelehrung für das Web-Abo (Stripe).
- [ ] Wird die App in der ~1 Sekunde zwischen Speichern und Cloud-Abgleich hart beendet, ist ein
      eben eingetragener Eintrag beim nächsten Start weg (lokal Ungesichertes wird bewusst nicht
      wiederbelebt, damit Gelöschtes nicht zurückkommt). Lösung: ungesicherte Einträge dauerhaft
      vormerken und nach dem Start nachreichen. (Rechnungs-Belege haben das schon.)

## Ideen für später
- [ ] Todoist-Anbindung (optional).
- [ ] Zeitplan-Feinschliff (Standard-Zeitspanne, Drag & Drop zwischen Abschnitten).
- [ ] Fehlermeldungen mit dynamischem Detail (z. B. „Fehler: …") sind sprachabhängig – ok;
      rein englische Feinschliff-Runde bei Bedarf.
