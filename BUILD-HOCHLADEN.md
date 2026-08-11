# App-Update in den App Store bringen (Build 8) – Schritt für Schritt

Ziel: Die **aktuelle Web-Version** (mit allen neuen Funktionen: neuer Zeitplan,
Wartungs-Erinnerungen, Beleg-Bilder, bessere Knöpfe, Foto-Härtung) als neues
App-Update in den App Store bringen – und die Ablehnung beheben.

Alles läuft an deinem **Mac mit Xcode**. Dauer: ca. 20–30 Min.

---

## TEIL A – Neuen Build am Mac erstellen & hochladen

### 1. Aktuellen Code holen
Terminal öffnen:
```
cd planory        (oder wo dein Projektordner liegt)
git checkout main
git pull origin main
```
> Damit hast du exakt die Live-Web-Version.

### 2. In die iOS-App übernehmen
```
npx cap sync ios
```
> Kopiert die aktuelle Web-App in das iOS-Projekt.

### 3. In Xcode öffnen
```
npx cap open ios
```
Xcode startet mit dem Projekt.

### 4. Build-Nummer erhöhen
- Links auf **App** (das Projekt) klicken → Reiter **General**.
- **Version** kann bleiben (z. B. 1.3) oder auf **1.4** erhöhen.
- **Build** um **1 erhöhen** (von 7 auf **8**). WICHTIG – sonst lehnt Apple ab.

### 5. Gerät auf „Any iOS Device" stellen
- Oben in der Mitte (neben dem App-Namen) das Zielgerät auf
  **„Any iOS Device (arm64)"** stellen (nicht Simulator!).

### 6. Archivieren
- Menü **Product → Archive**.
- Warten, bis der „Organizer" aufgeht (einige Minuten).

### 7. Hochladen
- Im Organizer den neuen Build auswählen → **Distribute App** →
  **App Store Connect** → **Upload** → alles bestätigen.
- Nach ~5–15 Min ist der Build in App Store Connect „verarbeitet".

---

## TEIL B – In App Store Connect einreichen

### 8. Kategorie fixen (Grund der Ablehnung!)
appstoreconnect.apple.com → **Apps → Planory → App-Informationen** →
Abschnitt **Kategorie** → **Primär** von **„Kinder"** auf **„Produktivität"**
ändern → **Sichern**. (Nur am Computer sichtbar.)
- Altersfreigabe steht bereits korrekt auf **4+**.

### 9. Neue Version anlegen / Build wählen
- Bei der App links auf **„+ Version"** (oder die vorhandene 1.3/1.4).
- Bei **Build** den neuen **Build 8** auswählen.
- **„Neue Funktionen dieser Version"** ausfüllen – Text steht in
  `APP-STORE-TEXT.md` (Abschnitt „Neue Funktionen").

### 10. Einreichen
- Oben rechts **„Zur Überprüfung hinzufügen" / „Speichern" → „Einreichen"**.
- Fertig. Prüfung dauert i. d. R. 1–3 Tage.

---

## Wichtige Hinweise
- **Bezahlen (In-App-Abo) ist NICHT in diesem Build** – das kommt als Build 9,
  nachdem Build 8 durch ist (Vorarbeiten siehe `ABO-IN-APP-SETUP.md`).
- **Falls die Foto-Aufnahme in der App weiter abstürzt:** Die Web-Härtung ist
  drin; falls es am iPhone trotzdem crasht, bauen wir für Build 9 das native
  Kamera-Plugin ein (siehe `OFFENE-PUNKTE.md`).
- **Testen vor dem Einreichen:** Über **TestFlight** kannst du den Build 8 vorab
  auf deinem iPhone testen (empfohlen, aber optional).
