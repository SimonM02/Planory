# Offene Punkte / To-do (Planory)

Kurze Merkliste, damit wir nichts vergessen. Stand: 11.08.2026.

## Landing-Page (ist LIVE auf planory.at) – noch nachzutragen
- [ ] **Konkreten Preis eintragen.** Aktuell steht im Abschnitt „Preise – fair &
      unkompliziert" nur „1 Monat gratis, danach faires Abo" (ohne Betrag).
      → Sobald der Preis fix ist (gleicher Preis für Web/Stripe und App/Apple),
      die Zahl eintragen, z. B. „danach 4,99 €/Monat".
- [ ] **„Im App Store laden"-Knopf** in der Landing ergänzen, sobald die App
      im App Store live ist und der App-Store-Link vorhanden ist.

## Rechnung scannen – Foto/Absturz
- [x] Bild wird beim Scannen gespeichert (Supabase) UND als Sicherheitsnetz direkt
      beim Eintrag (`scanData`), falls der Upload scheitert. Beleg ist jetzt auch
      aus der Kosten-Liste über 📎 öffenbar.
- [x] Foto-Verarbeitung speicherschonender + fehlertolerant gemacht (kann den
      Absturz bei großen Handy-Fotos verhindern). **Auf planory.at (Web) testbar;
      in der App erst mit dem nächsten Build (8) enthalten.**
- [ ] **Falls die Foto-Aufnahme in der iPhone-App weiter abstürzt:** Ursache ist
      dann sehr wahrscheinlich, dass iOS den Webview während der Kamera schließt.
      Lösung = natives **Capacitor Camera Plugin** in Build 8 (Claude baut den
      Code, du machst `npm install @capacitor/camera && npx cap sync ios`).
- [ ] Prüfen, dass der Supabase-Storage-Bucket **`uploads`** existiert und
      **public** ist (sonst greift nur das Sicherheitsnetz `scanData`).

## Zeitplan & Wartung (LIVE)
- [x] **Neuer Zeitplan LIVE:** Abschnitte (Bauphasen mit Zeitspanne) mit
      Unterpunkten; Status per Tipp (Offen/In Arbeit/Erledigt); inline anlegen;
      🔔 Erinnerung pro Punkt mit Datum. Bestehende Meilensteine unter
      „Weitere Punkte". Nichts migriert/gelöscht – Dashboard/KI/Erinnerungen
      laufen unverändert.
- [x] **Wartung-Erinnerungen LIVE:** pro Wartung einstellbar (am Tag +
      Vorlaufzeit), am Push-System angeschlossen.

## Android-Version (Play Store) – strategisch wichtig, NACH iOS-Launch
Marktrecherche (Aug 2026): Der Hauptkonkurrent POCASIO hat den Großteil seiner
Nutzer auf **Android** (1.000+ Play-Downloads vs. nur 2 Apple-Bewertungen) –
private Bauherren sind also überwiegend auf Android. iOS ist fast leer (Chance,
dort schnell Nr. 1 zu werden). Deshalb lohnt sich eine Android-Version.
- [ ] **Google-Play-Entwicklerkonto** anlegen (~25 € einmalig).
- [ ] `npx cap add android` → Build aus derselben `www/index.html` (kein Neubau!).
- [ ] Play-Store-Eintrag (Texte/Screenshots großteils vorhanden).
- [ ] **Abo für Android:** Google Play Billing – Abos in der Play Console anlegen,
      in RevenueCat als Google-Produkte ergänzen (RevenueCat kann beides).
- [ ] Reihenfolge: **erst iOS stabil live**, dann Android als nächster Meilenstein
      (nicht beides gleichzeitig).

## Ideen für später
- [ ] **Todoist-Anbindung** (optional): Aufgaben/Wartungen automatisch auch in
      Todoist spiegeln. Technisch möglich (Todoist-API/OAuth), aber eigenes
      Projekt + Pflege. Nur sinnvoll, wenn du sowieso alles in Todoist führst –
      Planory hat schon eigene Push-Erinnerungen.
- [ ] Zeitplan-Feinschliff möglich: Standard-Zeitspanne für neue Abschnitte,
      Punkte per Drag & Drop zwischen Abschnitten verschieben.

## Apple / App Store (App-Freigabe)
- [ ] **App-KATEGORIE ändern** (Grund der 3. Ablehnung, Guideline 1.3 Kids).
      Nur am **Computer** möglich (Handy zeigt das Feld nicht):
      App Store Connect → Apps → Planory → App-Informationen →
      Allgemeine Informationen → **Kategorie → Primär** von „Kinder" auf
      **„Produktivität"** ändern → Sichern.
      Danach Version 1.3 (Build 7) erneut „Zur Überprüfung freigeben".
      **Kein neuer Build nötig.** (Altersfreigabe steht bereits korrekt auf 4+.)
- [ ] **In-App-Abo (Apple)** einbauen – erst nachdem Build 7 durch ist.
      Details/Reihenfolge siehe `ABO-IN-APP-SETUP.md` (RevenueCat).
      Preis = gleicher Preis wie im Web (Apple behält 15 % ein → etwas kleinere
      Marge, aber gleicher Kundenpreis).

## SEO / Google-Sichtbarkeit
Schon erledigt (von Claude): Seiten-Metadaten, robots.txt, sitemap.xml,
strukturierte Daten (SoftwareApplication + FAQ), **Vorschaubild og-image.png**
(erscheint beim Teilen/Google), Landing-Page mit echtem Text.

Noch von DIR zu tun (am Computer oder Handy, dauert ~10 Min):
- [ ] **Google Search Console** einrichten – so kommt planory.at in den Index:
      1. search.google.com/search-console → mit Google-Konto anmelden
      2. „Property hinzufügen" → „URL-Präfix" → `https://planory.at`
      3. Verifizierung „HTML-Tag" wählen → den `google-site-verification`-Code
         **an Claude schicken** → Claude baut ihn ein → „Bestätigen"
      4. In Search Console links „Sitemaps" → `sitemap.xml` → „Senden"
      5. Oben `https://planory.at` eingeben → „Indexierung beantragen"
- [ ] Backlinks setzen: planory.at in **Instagram-Bio** und im **App-Store-Eintrag**
      als Website hinterlegen (hilft dem Google-Ranking).
- Hinweis: Google braucht nach dem Einrichten einige Tage bis ~3 Wochen, bis
  „planory" zuverlässig oben erscheint.
