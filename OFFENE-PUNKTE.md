# Offene Punkte / To-do (Planory)

Kurze Merkliste, damit wir nichts vergessen. Stand: 11.10.2026.

## Aktueller Stand (kurz)
- ✅ **App ist LIVE im App Store** – „Planory - Bauassistent" (`com.planory.bauassistent`).
- ✅ **Web (planory.at) ist live** und bekommt alle Fixes sofort.
- ✅ **Sicherheit gehärtet** (RLS `subscriptions`, Stripe-Webhook/Checkout, KI-Kostenschutz,
  XSS, DB-Funktionen) – Backend live.
- ✅ Im Web bereits live & für den nächsten iOS-Build bereit: **Helfer-Modul**,
  **Abo-Glückwunsch + Pro-Knopf**, **Landing-Preis**, **komplette DE/EN-Übersetzung**,
  **Eigenleistung-Fix**.

## 🔴 NÄCHSTER SCHRITT: iOS-Build v1.3 (wichtiger Speicher-Fix)
Die iPhone-App läuft mit dem eingebauten Stand v1.2 und hat noch den Fehler **„Ausgabe erscheint
kurz und verschwindet wieder"** (neuer Eintrag wurde beim Neuladen aus der Cloud überschrieben).
Im Web ist er seit 11.10.2026 behoben – in die App kommt er nur mit einem neuen Build.
- [ ] Mac: `git pull origin claude/apple-feedback-changes-owr1go` → `npx cap sync ios` → Xcode:
      **Version 1.3**, Build +1 → Archive → Upload (Ablauf wie NAECHSTER-BUILD-v1.2.md;
      Info.plist-Kamera-Einträge sind schon drin).
- [ ] What's New (Vorschlag):
      „• Wichtige Fehlerbehebung: neue Einträge gehen nach dem Speichern nicht mehr verloren
       • Rechnung scannen: verständliche Fehlermeldungen, Beträge wie 1.234,56 werden erkannt
       • Fotos zoomen · Dateien per Drag & Drop · übersichtlicherer Zeitplan
       • Helfer: Stunden pro Person · kleinere Verbesserungen"

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
- [ ] Zurückgestellte Wünsche: Angebote → Budgetkategorien, mehrere Fotos je Tagebuch-Tag,
      Tagebuch-Kategorien/Filter, Projekt-Export (Fotobuch + Tagebuch).

## Ideen für später
- [ ] Todoist-Anbindung (optional).
- [ ] Zeitplan-Feinschliff (Standard-Zeitspanne, Drag & Drop zwischen Abschnitten).
- [ ] Fehlermeldungen mit dynamischem Detail (z. B. „Fehler: …") sind sprachabhängig – ok;
      rein englische Feinschliff-Runde bei Bedarf.
