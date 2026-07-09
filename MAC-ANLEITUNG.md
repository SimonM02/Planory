# Planory → App Store: Anleitung für den Mac

Diese Datei Schritt für Schritt abarbeiten (oder der Claude-Session am Mac geben —
sie kann die Terminal-Befehle direkt ausführen).

Voraussetzungen: Xcode installiert, mit Apple-ID angemeldet
(Xcode → Settings → Accounts → "+" → Apple-ID des Developer-Accounts).

## 1. Projekt holen und iOS-App erzeugen

```bash
git clone https://github.com/SimonM02/Planory.git
cd Planory
npm install
npx cap add ios
npx cap sync ios
npx cap open ios     # öffnet Xcode
```

> Bei späteren Updates: `git pull && npm install && npx cap sync ios`
> (`npm install` nicht weglassen — neue Plugins wie die Benachrichtigungen
> kommen sonst nicht in die App!)

## Update hochladen (z.B. Build 5 mit Benachrichtigungen)

```bash
cd Planory        # bzw. der Ordner heißt evtl. klein: planory
git pull
npm install       # WICHTIG: installiert @capacitor/local-notifications
npx cap sync ios
npx cap open ios
```

Dann in Xcode:
1. Links Projekt **App** → Target **App** → Tab **General**
2. **Build**-Nummer um 1 erhöhen (z.B. 4 → 5). Version bleibt 1.0.
3. Gerät oben auf **Any iOS Device (arm64)**
4. **Product → Archive** → **Distribute App** → **App Store Connect** → **Upload**
5. In App Store Connect (Browser): Version öffnen → neuen Build auswählen
   → „Zur Prüfung einreichen"

### Benachrichtigungen danach testen (TestFlight oder Store-Version)
1. App öffnen → Einstellungen → Mitteilungen → **🔔 Erlauben** → iOS-Dialog bestätigen
2. **▶ Lokal testen** → nach ~1 Sekunde muss eine iPhone-Mitteilung erscheinen
3. Aufgabe mit heutigem Datum + Uhrzeit in 3 Minuten anlegen
4. App komplett schließen, Handy sperren → zur Uhrzeit kommt die Erinnerung
   am Sperrbildschirm

## 2. In Xcode konfigurieren (einmalig)

1. Links im Navigator das Projekt **App** anklicken → Target **App**
2. Tab **Signing & Capabilities**:
   - ✅ "Automatically manage signing" anhaken
   - **Team**: deinen Developer-Account auswählen
   - **Bundle Identifier**: muss `com.planory.bau` sein
3. Tab **General**:
   - Display Name: `Planory`
   - Version: `1.0`, Build: `1`

## 3. App-Icon einsetzen

1. Im Navigator: **App → App → Assets → AppIcon**
2. Die Datei `appstore-icon-1024.png` (liegt im Projektordner) per Drag & Drop
   in das 1024×1024-Feld ziehen

## 4. Testen im Simulator

- Oben Geräteauswahl: ein iPhone-Modell wählen → **▶ (Cmd+R)**
- App durchklicken: Login, Dashboard, Budgetplan, Dark Mode

## 5. Build für den App Store hochladen

1. Geräteauswahl oben auf **"Any iOS Device (arm64)"** stellen
2. Menü **Product → Archive** (dauert ein paar Minuten)
3. Im Organizer-Fenster: **Distribute App** → **App Store Connect** → **Upload**
   → alle Standardoptionen bestätigen
4. Nach ~15–30 Min. erscheint der Build in App Store Connect unter
   **TestFlight** bzw. bei der App-Version unter "Build"

## 6. Danach in App Store Connect (im Browser, geht auch am PC)

1. Version 1.0 öffnen → den hochgeladenen **Build auswählen**
2. Alle Pflichtfelder prüfen (Screenshots, Beschreibung, Datenschutz-URL,
   Test-Account für die Prüfung)
3. **Zur Prüfung hinzufügen** → einreichen

## Hinweise

- `npx cap add ios` nur beim ersten Mal — danach immer nur `npx cap sync ios`
- Wenn Xcode nach einem Passwort für den Schlüsselbund fragt: Mac-Passwort eingeben
- Fehler "Signing requires a development team" → Schritt 2 (Team auswählen)
