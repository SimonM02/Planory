# ⭐ iOS-Upload Version 1.4 – Schritt für Schritt

**Stand 22.11.2026:** Alle neuen Funktionen sind im Web live und getestet. Für das iPhone-Update braucht es
diese Datei, der Reihe nach abgearbeitet. Dauer insgesamt ca. 45 Minuten, plus Wartezeit bei Apple.

> **Vor dem Build noch einbauen (Claude, 24.11.2026):** Wer sich in der App registriert, öffnet den
> Bestätigungslink in Safari und landet dann auf der Website (Web-Abo statt Apple). Im Web gibt es dafür
> seit 24.11. den Hinweis „Zurück zur Planory-App“. Für 1.4 außerdem:
> (1) In der App beim `signUp` den Wert `emailRedirectTo` auf eine Seite setzen, die nur „Bestätigt – zurück
> zur App“ zeigt (vorher in Supabase › Auth › URL Configuration als erlaubte Adresse eintragen).
> (2) Sobald die App wieder offen ist (`appStateChange` aktiv), meldet sie sich selbst mit den Daten aus der
> Registrierung an, solange „Bestätige deine E-Mail“ angezeigt wird. Dann muss man nichts mehr eintippen.

---

## Schritt 1 – RevenueCat prüfen (Browser, ca. 5 Min.) – WICHTIG
Ohne funktionierende Abos können neue iPhone-Nutzer nicht kaufen.

1. app.revenuecat.com → Projekt **Planory** → **Product catalog → Products**.
2. Bei allen Apple-Produkten muss **kein** orangefarbenes „Could not check“ mehr stehen (das kam von der
   App-Store-Connect-Störung am 18.11.). Steht es noch da: Screenshot an Claude.
3. Es gibt **zwei** Apple-Apps („Planory (App Store)“ und „Planory Bauassistent“). Die echte ist die, deren
   **Public API Key** mit `appl_eML…` beginnt: links **Apps** → App anklicken → API-Key ansehen.
   Die zwei Produkte genau dieser App müssen im **Offering „current“** (Product catalog → Offerings)
   als Monats- und Jahres-Paket eingetragen sein.
4. **Nichts löschen.** Wenn etwas nicht passt: Screenshot an Claude.

## Schritt 2 – Mac: Code holen (Terminal)
```bash
cd Planory
git pull origin claude/apple-feedback-changes-owr1go
npm install
npx cap sync ios
npx cap open ios
```
- In der Ausgabe von `npx cap sync ios` stehen jetzt auch **capacitor-widget-bridge** (für die Widgets) sowie
  wie bisher RevenueCat, Kamera, Teilen, Dateien und App.
- Der neue Ordner `android/` ist für die spätere Android-App und stört das iPhone nicht.
- Bricht `git pull` mit „local changes“ ab: `git checkout -- package.json package-lock.json` und nochmal.

## Schritt 3 – Optional: Widgets (ca. 15 Min.)
Wer die Home-Bildschirm-Widgets gleich mit 1.4 möchte: **`WIDGETS-EINRICHTEN.md` Schritt 2–5**.
Ohne diesen Schritt läuft die App ganz normal, nur ohne Widgets (dann kommen sie mit 1.5).

## Schritt 4 – Xcode: Version und Upload
1. Links das blaue Projekt **App** → Target **App** → **General**.
2. **Version** = `1.4`, **Build** = um 1 höher als beim letzten Upload.
   (Mit Widgets: beim Target **PlanoryWidget** dieselbe Version und denselben Build eintragen.)
3. Geräteauswahl **Any iOS Device (arm64)** → **Product → Archive**.
4. **Distribute App → App Store Connect → Upload** → bestätigen.
5. Auf die Mail „…has completed processing“ warten (10–30 Min.).

## Schritt 5 – TestFlight: kurz am iPhone testen
- [ ] **Abo:** neues Testkonto, nach dem Onboarding „Starte deinen Gratismonat“, mit Sandbox-Konto kaufen,
      „Käufe wiederherstellen“.
- [ ] **Betrag:** Ausgabe mit „18.359,56“ eintippen. In der Liste steht 18.359,56 €.
- [ ] **Rechnung scannen:** dieselbe Rechnung zweimal, beim zweiten Mal kommt „Gibt es diese Rechnung schon?“.
- [ ] **Angebote:** mehrere Fotos/PDFs anhängen, „Neue Version“ anlegen, „Angebote vergleichen“.
- [ ] **KI-Hinweis:** kommt vor der ersten KI-Nutzung genau einmal („Kurzer Hinweis“), danach nie wieder.
- [ ] **Rückgängig:** etwas löschen, dann unten „Rückgängig“ tippen. Der Eintrag ist wieder da.
- [ ] **Suche:** 🔍 oben rechts, Firma oder Betrag eingeben, Treffer antippen.
- [ ] **Ladebildschirm** mit Logo-Aufbau, „Demnächst fällig“-Kärtchen auf der Startseite.
- [ ] Mit Widgets: Widget hinzufügen und „Rechnung scannen“ antippen. Planory öffnet den Scan.

## Schritt 6 – App Store Connect: Version einreichen
1. Planory → **iOS-App** → **+ Version** → `1.4` → **Build** wählen → Verschlüsselung: **Nein**.
2. **„Neue Funktionen“** (Deutsch):
   ```
   • Angebote: mehrere Fotos/PDFs, Versionen nach Nachverhandlung und Angebote miteinander vergleichen – was ist weggefallen, was dazugekommen, wo haben sich Preise geändert
   • Doppelte Rechnungen werden erkannt, bevor sie zweimal im Budget landen
   • Mappe: alle Belege einer Kategorie als ein PDF (z. B. für Bank oder Förderung)
   • NEU: Suche über alles – Firma, Stichwort oder Betrag
   • NEU: „Rückgängig“ nach dem Löschen
   • Beträge wie 18.359,56 € werden jetzt immer richtig übernommen
   • Ruhiges „Demnächst fällig“ auf der Startseite und neuer Ladebildschirm
   • Abmelden betrifft nur noch dieses Gerät
   • Viele kleine Verbesserungen und Fehlerbehebungen
   ```
   Mit Widgets zusätzlich ganz oben: `• NEU: Widgets für den Home-Bildschirm – Schnellzugriff und nächste Termine`

   Englisch:
   ```
   • Quotes: several photos/PDFs, versions after renegotiation and compare quotes – what was removed, what was added, where prices changed
   • Duplicate invoices are detected before they are counted twice
   • Folder: all receipts of a category as one PDF (e.g. for your bank or a grant)
   • NEW: search everything – company, keyword or amount
   • NEW: "Undo" after deleting
   • Amounts like 18,359.56 are now always taken over correctly
   • Calm "Coming up" card on the home screen and new loading screen
   • Signing out only affects this device
   • Many small improvements and bug fixes
   ```
   With widgets add at the top: `• NEW: Home Screen widgets – quick actions and upcoming dates`
3. **App-Review-Informationen → Anmerkungen** (Prüfer-Konto bleibt, vorher einmal damit einloggen):
   ```
   Hello,
   Planory is a project-management app for adults building or renovating a house.
   New in 1.4: quote versions and quote comparison, duplicate-invoice warning, search, undo after delete.
   AI features (invoice/quote scan, quote comparison, building advisor): before the FIRST transfer of any
   content to a third-party AI service, the app shows a one-time consent dialog ("Quick note … processed
   by an AI service – not for training", OK / Cancel). Cancel sends nothing. The provider (Anthropic, USA)
   is named in the privacy policy (https://planory.at/datenschutz.html). The demo account in the Sign-In
   Information has full access.
   Thank you!
   ```
4. **Zur Prüfung hinzufügen → Zur Prüfung einreichen.**

## Schritt 7 – Danach (nicht für den Upload nötig)
- **RevenueCat-Webhook** (OFFENE-PUNKTE 5c): Apple-Abos erscheinen dann auch in Supabase.
- **Fotos-Speicher absichern** (OFFENE-PUNKTE 10a): erst, wenn die meisten Nutzer 1.4 haben.
- Die neuen Funktionen ins Info-/Hilfe-Material und in einen Instagram-Post übernehmen.

## So erkennst du, dass alles geklappt hat
- Nach Schritt 4: Build in TestFlight „Bereit zum Testen“.
- Nach Schritt 6: Status „Warten auf Prüfung“, später Mail „Ready for Distribution“.
- Danach zeigt die alte App (1.3) beim Start unten „🆕 Neue Planory-Version verfügbar“.
