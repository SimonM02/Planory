# Offene To-dos für Simon

Stand: 30.07.2026 (nach dem Sync-Vorfall und dessen Aufarbeitung)

## ✅ Diese Woche erledigt (zur Übersicht)

- Sync-Vorfall aufgeklärt: Ursache war Speicher-Überlauf durch eingebettete
  Dateien (4,3-MB-PDF im Datensatz) + fehlende Dateiablage (Buckets existierten nie)
- Kundendaten waren nie verloren (119 Einträge durchgehend in der Cloud)
- Storage-Buckets `uploads` + `dokumente` angelegt, Upload getestet ✅
- Automatische Datei-Umräumung eingebaut (läuft im Hintergrund beim Laden)
- **Sync-Sicherheitsnetz:** Gerät ohne frisch geladene Cloud-Daten kann nichts
  mehr hochladen → Überschreiben durch alte Stände technisch unmöglich
- Die 3 gefährlichen Cloud-Knöpfe entfernt (Web; App mit Build 7)
- Offline-Meldung + Auto-Neuladen bei Verbindungs-Rückkehr
- Abmelde-Schutz (löscht nichts mehr ungesichert)
- Prüfprogramm `tests/pruefen.mjs`: **47 automatische Checks** vor jedem Upload
- Web/App-Datei Byte für Byte identisch (wird jetzt dauerhaft geprüft)

## 🍎 WICHTIGSTER OFFENER PUNKT: Build 7 (Version 1.3) am Mac

Die App läuft noch auf Build 6 – **ohne** Sicherheitsnetz, **mit** den
gefährlichen Knöpfen, **mit** dem Speicher-Fehler. Bis Build 7 draußen ist:
Kunden sollen in der App die Cloud-Knöpfe nicht anfassen.

- [ ] `cd planory && git pull && npm install && npx cap sync ios && npx cap open ios`
- [ ] Xcode: Capability **„Push Notifications"** hinzufügen
- [ ] Xcode: **iPad** als Zielgerät aktivieren (Supported Destinations)
- [ ] iPad-Simulator: Hoch- + Querformat kurz durchklicken
- [ ] Version **1.3**, Build **7** → Archive → Upload
- [ ] **Empfehlung:** erst TestFlight (interne Tester = sofort, ohne Review) selbst testen
- [ ] App Store Connect: Version 1.3 anlegen, Release-Notes (siehe APPSTORE-TEXT.md),
      **Screenshots iPhone + iPad** (iPad ist Pflicht!), einreichen

## 🔴 Vor dem öffentlichen Start: Sync-Umbau Phase 2+4

- [ ] **Testumgebung** anlegen (~15 Min): zweites, kostenloses Supabase-Projekt
      als Spielwiese – Voraussetzung für alles Weitere
- [ ] Phase 2: Budget-Kategorien + Projekteinstellungen **zeilenweise** speichern
      (wie Rechnungen) → „letzter gewinnt" strukturell beseitigt
- [ ] Phase 4: Versionsprüfung beim Schreiben (Server weist veraltete Stände ab)
- [ ] Danach Zwei-Fenster-Test gemeinsam (Checkliste in SYNC-FINDINGS.md)

## 🖥️ Am Laptop (jederzeit)

- [ ] **Native Push (APNs)** aktivieren – Anleitung `NATIVE-PUSH-SETUP.md`:
  - [ ] Supabase-Tabelle `native_push_tokens` (SQL im Doc)
  - [ ] Apple .p8-Schlüssel + Key-ID + Team-ID (.p8 nur EINMAL ladbar!)
  - [ ] Vercel: APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID / APNS_BUNDLE_ID → Redeploy
- [ ] *Optional:* App-Store-Texte einpflegen (`APPSTORE-TEXT.md`)
- [ ] *Optional:* Stripe-Portal-Name auf „Planory"
- [ ] *Optional:* CRON_SECRET sauber in Vercel + GitHub setzen

## 📱 Vom Handy

- [ ] Formatierungs-Fehler als Screenshots sammeln → an Claude

## 💬 Offene Entscheidungen an Claude

- [ ] Menü-Umbau: Rückmeldung zur Vorschau geben (Gruppen ok? nur eine offen?
      auch am Computer eingeklappt?) → dann baue ich es
- [ ] Geld-Dokumente (Angebots-PDFs, Rechnungs-Scans) in den privaten Bucket
      verschieben (statt public) – kleiner Folge-Schritt, braucht signierte Links
