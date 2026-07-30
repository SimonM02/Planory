# Offene To-dos für Simon

Stand: 30.07.2026 (nach dem Sync-Vorfall + iPad-Build 7)

## ✅ Bereits erledigt (zur Übersicht)

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
- Prüfprogramm `tests/pruefen.mjs`: **51 automatische Checks** vor jedem Upload
- Web/App-Datei Byte für Byte identisch (wird jetzt dauerhaft geprüft)
- iPad-Hochformat korrigiert (Karten/Formulare passen sich der Breite an)
- **Build 7 (Version 1.3) archiviert und zu App Store Connect hochgeladen** ✅
  (Vision-Pro-Hinweis ITMS-90984 = nur Info, keine Aktion nötig)

---

# 🎯 Nächste Schritte nach Priorität

## 1️⃣ JETZT: Build 7 einreichen (in App Store Connect, im Browser)

Der Upload ist durch – es fehlt nur noch das Einreichen. Solange Build 7 nicht
freigegeben ist, laufen Kunden noch auf Build 6 (ohne Sicherheitsnetz).

- [ ] Warten bis Build 7 „Processing" fertig ist (~5–15 Min)
- [ ] Version 1.3 → **Build 7** auswählen
- [ ] **Screenshots** iPhone + iPad 13" in die Slots ziehen (iPad ist Pflicht)
- [ ] **„Neues in dieser Version"** einfügen (Text in `APPSTORE-TEXT.md`)
- [ ] Speichern → **Zur Prüfung einreichen**

## 2️⃣ VOR dem öffentlichen Start: Sync-Umbau Phase 2+4

Das ist der wichtigste Punkt, damit ein Vorfall wie zuletzt technisch
unmöglich wird, bevor echte Kunden alle Rechnungen etc. drin haben.

- [ ] **Testumgebung** anlegen (~15 Min): zweites, kostenloses Supabase-Projekt
      als Spielwiese – Voraussetzung für alles Weitere (URL + anon-Key an Claude)
- [ ] Phase 2: Budget-Kategorien + Projekteinstellungen **zeilenweise** speichern
      (wie Rechnungen) → „letzter gewinnt" strukturell beseitigt
- [ ] Phase 4: Versionsprüfung beim Schreiben (Server weist veraltete Stände ab)
- [ ] Danach Zwei-Fenster-Test gemeinsam (Checkliste in SYNC-FINDINGS.md)

## 3️⃣ Erinnerungen zuverlässig auf ALLEN Geräten: Server-Push (APNs)

Aktuell plant jedes Gerät seine Erinnerungen nur lokal ein – ein Gerät erinnert
nur an Aufgaben, die es beim letzten Öffnen schon kannte. Für zuverlässige
Meldungen auf allen angemeldeten Geräten muss der Server pushen. Grundgerüst
liegt bereit (`NATIVE-PUSH-SETUP.md`), nur die Aktivierung fehlt:

- [ ] Supabase-Tabelle `native_push_tokens` anlegen (SQL im Doc)
- [ ] Apple **.p8-Schlüssel** + Key-ID + Team-ID holen (Developer Portal →
      Certificates → Keys). **.p8 nur EINMAL herunterladbar!**
- [ ] Vercel-Variablen: APNS_KEY / APNS_KEY_ID / APNS_TEAM_ID / APNS_BUNDLE_ID
      → Redeploy
- [ ] Gemeinsam testen: Aufgabe auf Gerät A → Meldung kommt auf Gerät B

---

## 🖥️ Kleinere Punkte (jederzeit, wenn Zeit)

- [ ] Geld-Dokumente (Angebots-PDFs, Rechnungs-Scans) in den **privaten** Bucket
      verschieben statt public – braucht signierte Links
- [ ] *Optional:* App-Store-Texte final einpflegen (`APPSTORE-TEXT.md`)
- [ ] *Optional:* Stripe-Portal-Name auf „Planory"
- [ ] *Optional:* CRON_SECRET sauber in Vercel + GitHub setzen

## 💬 Offene Entscheidung an Claude

- [ ] Menü-Umbau: Rückmeldung zur Vorschau geben (Gruppen ok? nur eine offen?
      auch am Computer eingeklappt?) → dann baue ich es
