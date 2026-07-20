# Offene To-dos für Simon

Kurze, feste Merkliste dessen, was noch von dir zu erledigen ist (Code ist jeweils fertig).

## 🖥️ Am Laptop (jederzeit, ohne Mac)

- [ ] **Native Push aktivieren – Teil 1–3** (Anleitung: `NATIVE-PUSH-SETUP.md`)
  - [ ] Supabase: Tabelle `native_push_tokens` anlegen (SQL im Doc)
  - [ ] Apple Developer: APNs-Schlüssel **.p8** erstellen + Key-ID & Team-ID notieren (.p8 nur EINMAL ladbar!)
  - [ ] Vercel: `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` eintragen → Redeploy
- [ ] *Optional:* App-Store-Text einpflegen (aus `APPSTORE-TEXT.md`, ohne neue Prüfung)
- [ ] *Optional:* Stripe-Kundenportal-Name auf „Planory" (Einstellungen → Geschäftsdaten)
- [ ] *Optional:* sauberes `CRON_SECRET` in Vercel **und** GitHub setzen (aktuell offen, harmlos)

## 🍎 Am Mac (nächster Build 7 / Version 1.3)

- [ ] `cd planory && git pull && npm install && npx cap sync ios && npx cap open ios`
- [ ] Xcode: Capability **„Push Notifications"** hinzufügen (für Native Push)
- [ ] Xcode: **iPad** als Zielgerät aktivieren („Supported Destinations")
- [ ] iPad-Layout im Simulator durchklicken (Hoch- + Querformat)
- [ ] Version **1.3**, Build **7** → Archive → hochladen → einreichen
- [ ] **Screenshots** neu: iPhone + **iPad** (für App Store Connect Pflicht)

## 📱 Vom Handy

- [ ] Formatierungs-Fehler als Screenshots sammeln → an Claude (kommen in Build 7 mit)

## 🔴 Wichtig: Cloud-Sync absichern (mit Test!)

- [ ] Datenintegritäts-Fixes im Sync umsetzen (Details: `SYNC-FINDINGS.md`)
      → nur MIT anschließendem Zwei-Fenster-Test (gleicher Account), weil ein
      falscher Sync-Fix selbst Daten kosten kann. Wichtig, bevor viele Leute
      gleichzeitig am selben Konto arbeiten.

## 🟠 Echte Datei-Ablage (Supabase Storage) – Bucket anlegen!

- [ ] **Supabase-Bucket `uploads` (public) anlegen + Policies** → Anleitung:
      `STORAGE-SETUP.md`. Der Code lädt Fotos jetzt dorthin hoch (mit
      Base64-Fallback, solange der Bucket fehlt). ERST mit Bucket wandern
      Uploads wirklich in die Cloud und der lokale Speicher läuft nicht voll.
- [ ] Danach testen: Foto hochladen → erscheint in Supabase Storage `uploads`.
- [ ] Folge-Schritt (später): auch Angebot-Anhänge + Rechnungs-Scan komplett
      über Storage (Ansichten müssen alte Base64- UND neue URL-Einträge zeigen).

## ✅ Nach Build 7 testen

- [ ] App: Mitteilungen erlauben → „Server-Push testen" → echte Push kommt an?
- [ ] Erinnerung auf einem Gerät anlegen → kommt sie auf allen Geräten an?
- [ ] Diagnose-Infos vom Test-Knopf an Claude, falls etwas hakt (Sandbox vs. Produktion!)
