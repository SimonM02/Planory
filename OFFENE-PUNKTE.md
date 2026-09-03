# Offene Punkte / To-do (Planory)

Kurze Merkliste, damit wir nichts vergessen. Stand: 21.08.2026.

## Aktueller Stand (kurz)
- ✅ **App ist LIVE im App Store** – „Planory - Bauassistent" (`com.planory.bauassistent`), Version 1.1.
- ✅ **Alte App** aus dem Verkauf genommen.
- ✅ **Sicherheit gehärtet** (RLS `subscriptions`, Stripe-Webhook/Checkout, KI-Endpunkt-
  Kostenschutz, KI-/Rechnungs-XSS) – Backend live, Rest im Web live.
- **Web (planory.at) ist live** und bekommt alle Fixes sofort.

## 🔴 HOTFIX 1.1.1 (dringend – Live-Bug!)
- [ ] **Kamera-Absturz beim Rechnung-Scannen** beheben: In Xcode **Info.plist** ergänzen
      (die App stürzt sonst beim „Take Photo" ab, weil die Berechtigung fehlt):
  - `NSCameraUsageDescription` → „Planory nutzt die Kamera, um Rechnungen und
    Baufortschritt zu fotografieren."
  - `NSPhotoLibraryUsageDescription` → „Planory braucht Zugriff auf deine Fotos, um
    Belege hinzuzufügen."
  → Version **1.1.1** bauen, hochladen, einreichen. (Optional robuster: nativer Camera-
     Picker im Scan – Claude baut den Code, falls der Info.plist-Fix nicht reicht.)
- [ ] **App-Store-Untertitel** im selben Update setzen (30 Zeichen, wird von Apple
      für die Suche indexiert – aktuell im US-Store LEER):
  - Deutsch: `Hausbau: Budget & Baukosten`
  - English: `Home build: budget & costs`
  → App Store Connect → Version → je Sprache Feld **„Untertitel"**. Details in APP-STORE-TEXT.md.

## Für das nächste App-Update (v1.2) – schon live im Web, Code liegt bereit
- [ ] Neuen Build ziehen. **Vorher** für den nativen Foto-Picker einmalig:
      `npm install @capacitor/camera` → dann `git pull` → `npx cap sync ios` → Archive.
       Enthalten ist dann:
  - Willkommens-Dialog nach dem Onboarding (Begrüßung + Gratismonat/Abo-Erklärung)
  - Nach dem Onboarding landet man zuverlässig auf dem Dashboard
  - Entwickler-Block „Diagnose & Test" aus den Einstellungen entfernt
  - **Glückwunsch-Dialog nach Abo-Abschluss** + „⭐ Planory Pro"-Knopf in der Seitenleiste
    (kein Umweg mehr über die Einstellungen) — im Web bereits live.
  - **Mehrfach-Foto-Upload** in der App (nativer Picker). Dazu in Xcode/Info.plist
    `NSPhotoLibraryUsageDescription` ergänzen (Text: „Planory braucht Zugriff auf
    deine Fotos, um Baufortschritt-Bilder hinzuzufügen.").

## Authentifizierungs-E-Mails (Supabase) – Texte fertig, Einbau bei Simon
- [ ] Fertige deutsche Texte für „Confirm signup" + „Reset password" ins
      **Supabase-Dashboard → Authentication → Email Templates** einfügen
      (Texte liegen vor – von Claude geliefert).
- [ ] Absendername in Supabase auf **„Planory"** setzen (statt „Supabase Auth").

## Landing-Page (live auf planory.at)
- [ ] **Konkreten Preis eintragen** im Abschnitt „Preise". App/Web nutzen aktuell
      **3,99 €/Monat** bzw. **28,99 €/Jahr** – sobald bestätigt, Zahl in die Landing
      eintragen. (Claude kann das sofort machen.)
- [ ] **„Im App Store laden"-Knopf** ergänzen, sobald die App live ist und der
      App-Store-Link vorliegt.

## Rechnung scannen – Kamera in der iPhone-App
- [x] Bild wird gespeichert (Supabase) + Sicherheitsnetz `scanData`; speicherschonende,
      fehlertolerante Foto-Verarbeitung (Web live).
- [ ] **Falls die Kamera in der App abstürzt:** natives **Capacitor Camera Plugin**
      einbauen (Claude schreibt Code; `npm install @capacitor/camera && npx cap sync ios`,
      dann neuer Build).
- [ ] Prüfen, dass der Supabase-Storage-Bucket **`uploads`** existiert und **public** ist.

## Android-Version (Play Store) – NACH iOS-Launch
Marktrecherche: Hauptkonkurrent POCASIO hat die meisten Nutzer auf **Android**
(1.000+ Play-Downloads). iOS ist fast leer – dort schnell Nr. 1 werden, dann Android.
- [ ] Google-Play-Entwicklerkonto (~25 $ einmalig).
- [ ] `npx cap add android` → Build aus derselben `www/index.html` (kein Neubau der App).
- [ ] Abo: Google Play Billing anlegen + in RevenueCat als Google-Produkte ergänzen.
- [ ] **Kleiner Code-Eingriff:** RevenueCat-Schlüssel je Plattform wählen
      (iOS `appl_…` / Android `goog_…`) – Claude macht die Weiche.
- [ ] Optional: Server-Push via Firebase (FCM). Lokale Erinnerungen laufen schon.

## SEO / Google-Sichtbarkeit
Erledigt (Claude): Metadaten, robots.txt, sitemap.xml, strukturierte Daten, og-image.
- [ ] **Google Search Console** einrichten (search.google.com/search-console →
      Property `https://planory.at` → HTML-Tag-Code **an Claude schicken** → einbauen →
      bestätigen → Sitemap `sitemap.xml` senden → Indexierung beantragen).
- [ ] Backlinks: planory.at in Instagram-Bio + App-Store-Eintrag hinterlegen.

## Ideen für später
- [ ] Todoist-Anbindung (optional).
- [ ] Zeitplan-Feinschliff (Standard-Zeitspanne, Drag & Drop zwischen Abschnitten).
