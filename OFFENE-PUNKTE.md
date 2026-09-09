# Offene Punkte / To-do (Planory)

Kurze Merkliste, damit wir nichts vergessen. Stand: 09.09.2026.

## Aktueller Stand (kurz)
- ✅ **App ist LIVE im App Store** – „Planory - Bauassistent" (`com.planory.bauassistent`).
- ✅ **Web (planory.at) ist live** und bekommt alle Fixes sofort.
- ✅ **Sicherheit gehärtet** (RLS `subscriptions`, Stripe-Webhook/Checkout, KI-Kostenschutz,
  XSS, DB-Funktionen) – Backend live.
- ✅ Im Web bereits live & für den nächsten iOS-Build bereit: **Helfer-Modul**,
  **Abo-Glückwunsch + Pro-Knopf**, **Landing-Preis**, **komplette DE/EN-Übersetzung**,
  **Eigenleistung-Fix**.

## 🔴 NÄCHSTER SCHRITT: iOS-Upload v1.2  →  siehe NAECHSTER-BUILD-v1.2.md
Ein Build erledigt alles auf einmal (inkl. Kamera-Absturz-Fix). Kurz:
- [ ] **Kamera-Recht in Info.plist** (`NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription`)
      → behebt den Scan-Absturz. **Einziger echter Blocker.**
- [ ] **Version 1.2** bauen (Xcode) → hochladen.
- [ ] App Store Connect: Build zuweisen, **Untertitel (DE)** `Hausbau: Budget & Baukosten`,
      **englische Lokalisierung** anlegen (Texte in APP-STORE-TEXT.md), What's-New, einreichen.
> Genaue Schritt-für-Schritt-Anleitung in **NAECHSTER-BUILD-v1.2.md**.

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

## Ideen für später
- [ ] Todoist-Anbindung (optional).
- [ ] Zeitplan-Feinschliff (Standard-Zeitspanne, Drag & Drop zwischen Abschnitten).
- [ ] Fehlermeldungen mit dynamischem Detail (z. B. „Fehler: …") sind sprachabhängig – ok;
      rein englische Feinschliff-Runde bei Bedarf.
