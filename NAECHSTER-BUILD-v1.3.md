# ⭐ iOS-Upload Version 1.3 – Schritt für Schritt

**Stand 20.10.2026:** Alles ist im Web live und getestet. Es fehlen nur der Gratismonat in App Store
Connect, der neue Build und das Einreichen. Diese Datei der Reihe nach abarbeiten.

---

## Schritt 1 – App Store Connect: Gratismonat anlegen (Browser, ca. 5 Min.)
Ohne diesen Schritt zahlen neue iPhone-Nutzer sofort, statt 1 Monat gratis zu testen.

1. appstoreconnect.apple.com → **Apps** → **Planory - Bauassistent**.
2. Links **Monetarisierung → Abos** (bzw. „In-App-Käufe und Abos“ → Abos) → die Abo-Gruppe öffnen.
3. Das **Monats-Abo** anklicken → Bereich **Abopreise** → **Einführungsangebote** → **+**
   (bzw. „Einführungsangebot erstellen“):
   - Länder: **Alle**
   - Startdatum: **heute**, Enddatum: **keines**
   - Art: **Kostenlos** (Gratis-Testzeitraum)
   - Dauer: **1 Monat** → **Weiter / Bestätigen**
4. Dasselbe beim **Jahres-Abo**.
5. Prüfen: Bei beiden Abos steht jetzt „Einführungsangebot: Kostenlos, 1 Monat“.

## Schritt 2 – Mac: Code holen (Terminal)
Im Terminal einzeln einfügen, jeweils mit Enter:
```bash
cd Planory                                   # oder dorthin, wo der Ordner liegt
git checkout -- package.json package-lock.json
git pull origin claude/apple-feedback-changes-owr1go
npm install
npx cap sync ios
npx cap open ios                             # öffnet Xcode
```
- `git checkout -- …` wirft nur die früher von Hand installierten Paket-Einträge weg (sonst bricht
  der Pull ab).
- Nach `npx cap sync ios` müssen in der Ausgabe stehen: **@revenuecat/purchases-capacitor**,
  **@capacitor/camera**, **@capacitor/share**, **@capacitor/filesystem**, **@capacitor/app**.
- Kommt beim Pull trotzdem ein Fehler (z. B. „local changes“): Fehlertext an Claude schicken.

## Schritt 3 – Xcode: Version und Upload
1. Links oben auf das blaue Projekt **App** → Target **App** → Tab **General**.
2. **Version** = `1.3`, **Build** = um 1 höher als beim letzten Upload.
3. Oben in der Geräteauswahl **Any iOS Device (arm64)** wählen.
4. Menü **Product → Archive** (dauert ein paar Minuten, dann öffnet sich der Organizer).
5. **Distribute App** → **App Store Connect** → **Upload** → Standardoptionen bestätigen → **Upload**.
6. Warten auf „Upload succeeded“. Apple verarbeitet danach 10–30 Minuten (Mail „…has completed
   processing“).
- Kamera- und Fotos-Einträge in der Info.plist sind schon drin – nichts zu tun.

## Schritt 4 – Empfohlen: kurz in TestFlight testen
In der TestFlight-App auf dem iPhone den neuen Build installieren und testen:
- **Bautagebuch:** Fotos hinzufügen. Die App darf nicht hängen.
- **Pläne:** einen Plan löschen, die App schließen und wieder öffnen. Der Plan bleibt weg.
- **Fenster:** ein Eingabefenster offen ganz nach unten scrollen. Die Seite dahinter bewegt sich nicht.
- **Neues Testkonto:** registrieren, dann:
  - Nach dem Onboarding erscheint „Starte deinen Gratismonat“ mit „1 Monat gratis, danach
    28,99 € / Jahr“.
  - Mit dem Sandbox-Konto kaufen. Es erscheint „Dein Gratismonat läuft“.
  - „Käufe wiederherstellen“ funktioniert.

## Schritt 5 – App Store Connect: Version einreichen (Browser)
1. Planory → links **iOS-App** → **+ Version** (bzw. „Version oder Plattform hinzufügen“) → `1.3`.
2. **Build** → **+** → den neuen Build wählen. Verschlüsselung (Export-Compliance): **Nein**.
3. **„Neue Funktionen“** einfügen (Deutsch):
   ```
   Großes Update:
   • 1 Monat gratis testen – danach jederzeit kündbar
   • NEU: Aufgaben – eigene Kategorien, Unteraufgaben, „Heute“ und „Kommende Tage“, wiederkehrende Aufgaben und Uhrzeit
   • Zeitplan neu: übersichtlicher, Status per Tipp, Punkte landen automatisch im richtigen Abschnitt
   • Budget und Kostenentwicklung als klare Grafiken
   • Ausgaben „nicht im Budget“ (z. B. Eigenleistung) per Häkchen
   • Startseite: Schalter für Beträge und KI-Berater
   • Bautagebuch: Fotos im Eintrag, Wetter per Antippen und als Erinnerungs-Buch (PDF)
   • PDFs und Fotos teilen, drucken oder in Dateien sichern
   • Rechnung scannen: Kategorie wird automatisch erkannt, „Bezahlt von“ direkt eintragen
   • Ausgabenliste nach Kategorie filtern – mit Summe
   • Viele Verbesserungen und Fehlerbehebungen – Einträge gehen nicht mehr verloren
   ```
   Englisch (falls die englische Sprache angelegt ist):
   ```
   Big update:
   • Try 1 month free – cancel anytime
   • NEW: Tasks – your own categories, subtasks, "Today" and "Upcoming", recurring tasks and times
   • New schedule: clearer, status with one tap, items land in the right section automatically
   • Budget and cost trend as clear charts
   • Expenses "not in budget" (e.g. own work) with one tick
   • Home screen: switches for amounts and the AI advisor
   • Site diary: photos in entries, weather with one tap and a keepsake book (PDF)
   • Share, print or save PDFs and photos to Files
   • Invoice scan: category detected automatically, enter "Paid by" directly
   • Filter the expense list by category – with total
   • Many improvements and bug fixes – entries no longer get lost
   ```
4. **Beschreibung:** den Preis-Absatz durch den neuen Text aus `APP-STORE-TEXT.md` ersetzen
   („Einen Monat gratis testen … zahlst du nichts.“; Englisch: „Try it free for one month …“).
5. **App-Review-Informationen:**
   - **Anmeldeinformationen:** das bestehende Prüfer-Konto bleibt. Vorher einmal damit einloggen.
   - **Anmerkungen:** diesen Text einfügen:
   ```
   Hello,
   Planory is a project-management app for adults building or renovating a house (not for children;
   Productivity/Finance, 4+, "Made for Kids" not applicable).
   New in 1.3: new accounts see a screen "Start your free month" right after onboarding. Both
   subscriptions (monthly/yearly) have a 1-month free trial as introductory offer; price after the
   trial, auto-renewal and how to cancel are shown on that screen, together with "Restore purchases",
   Terms of Use (EULA) and Privacy links. The demo account in the Sign-In Information has full access.
   To see the purchase screen with it: Settings → "My plan" → "View Planory Pro".
   Thank you!
   ```
6. Die Abos musst du nicht neu zur Prüfung hinzufügen. Das Einführungsangebot prüft Apple mit der
   Version.
7. Oben rechts **Zur Prüfung hinzufügen** → **Zur Prüfung einreichen**.

## Schritt 6 – Danach (nicht für den Upload nötig)
- **Stripe:** Einstellungen → Billing → **Kundenportal → Abos kündigen: „Am Ende des
  Abrechnungszeitraums“**.
- **Optional, Stripe:** Erinnerung 7 Tage vor Ende des Testzeitraums einschalten.
- **AGB** (`agb.html`) von WKO oder Anwalt prüfen lassen.
- **Apple-Abo im Web prüfen:** mit einem Konto, das ein Apple-Abo hat, auf planory.at einloggen.
  Dort muss „Pro-Mitglied“ stehen.

## So erkennst du, dass alles geklappt hat
- **Nach Schritt 3:** Der Build steht in App Store Connect unter TestFlight als „Bereit zum Testen“.
- **Nach Schritt 5:** Die Version hat den Status „Warten auf Prüfung“.
- **Nach der Freigabe:** Es kommt die Mail „Ready for Distribution“. Dann im App Store auf 1.3
  aktualisieren und mit einem neuen Konto das Gratismonat-Fenster prüfen.
