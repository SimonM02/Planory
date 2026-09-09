# ⭐ iOS-Upload Version 1.2 – die einzige Checkliste (Schritt für Schritt)

**Stand:** Alles Code-/Web-seitige ist fertig, getestet und live im Web. Es fehlt nur noch
der neue iOS-Build + das Einreichen. Diese Datei der Reihe nach abarbeiten.

## Was in v1.2 neu ist (alles schon im Code)
1. **Kamera-Absturz beim Rechnung-Scannen behoben** (durch den Info.plist-Schritt unten) 🔴
2. **Neues Modul „Helfer"** (zuschaltbar): Helfer-Tage mit Kalender planen, Bedarf (½/ganzer
   Tag), Helfer zuweisen, offene Plätze, Erinnerung 1 Woche vorher, automatische Übernahme
   der eingeteilten Helfer ins Bautagebuch.
3. **Glückwunsch-Dialog nach Abo-Abschluss** + prominenter „⭐ Planory Pro"-Knopf in der
   Seitenleiste (kein Umweg mehr über die Einstellungen).
4. **App komplett zweisprachig** (Deutsch/Englisch) – Menüs, Dialoge, Meldungen, Formularfelder.
5. **Fehlerbehebung**: „Eigenleistung speichern" ging nicht mehr – behoben.
6. Willkommens-Dialog nach dem Onboarding, zuverlässige Dashboard-Landung, Diagnose-Block
   aus den Einstellungen entfernt.
7. **Mehrfach-Foto-Upload** (nativer Picker) – optional, siehe Schritt 1.

---

## Schritt 1 – Code holen (Terminal am Mac)
```bash
cd Planory
git pull origin claude/apple-feedback-changes-owr1go
npm install
npm install @capacitor/camera   # OPTIONAL: nur für Mehrfach-Foto. Ohne geht der Build
                                 # trotzdem – der Foto-Upload nutzt dann das normale Feld.
npx cap sync ios
npx cap open ios                 # öffnet Xcode
```

## Schritt 2 – Xcode: Berechtigungen (das ist der Kamera-Fix! 🔴)
Projekt **App** → Target **App** → Tab **Info** → mit „+" zwei Einträge hinzufügen:

| Schlüssel (Anzeige in Xcode) | Text |
|---|---|
| **Privacy - Camera Usage Description** (`NSCameraUsageDescription`) | `Planory nutzt die Kamera, um Rechnungen und Baufortschritt zu fotografieren.` |
| **Privacy - Photo Library Usage Description** (`NSPhotoLibraryUsageDescription`) | `Planory braucht Zugriff auf deine Fotos, um Baufortschritt-Bilder und Belege hinzuzufügen.` |

> Ohne das **Kamera**-Recht stürzt die App beim „Take Photo" ab – das ist der Live-Bug.
> Info.plist wird von `npx cap sync` NICHT überschrieben; die Einträge bleiben bei künftigen Builds.

## Schritt 3 – Xcode: Version & Upload
1. Tab **General**: **Version** = `1.2`, **Build** um 1 erhöhen (nächste Zahl).
2. Geräteauswahl oben: **Any iOS Device (arm64)**.
3. **Product → Archive** → **Distribute App → App Store Connect → Upload** (Standardoptionen bestätigen).

## Schritt 4 – App Store Connect (Browser)
1. Neue Version **1.2** anlegen → hochgeladenen **Build zuweisen**.
2. **Untertitel (Deutsch)** setzen: `Hausbau: Budget & Baukosten`
3. **Englische Lokalisierung** anlegen (oben Sprache **Englisch (U.S.)** hinzufügen) und Name/
   Untertitel/Beschreibung/Keywords aus **APP-STORE-TEXT.md** einfügen
   (Name: `Planory - Building Assistant`, Untertitel: `Home build: budget & costs`).
4. **„Neue Funktionen" (What's New)** einfügen (Vorschlag unten).
5. **Export-Compliance:** NEIN.
6. **Zur Prüfung einreichen.**

## „Neue Funktionen" (What's New) – zum Reinkopieren
```
• Fehlerbehebung: Kamera beim Rechnung-Scannen
• Neu: Helfer-Planung mit Kalender – einteilen, wer wann hilft, direkt mit dem Bautagebuch verbunden
• Glückwunsch-Meldung nach dem Abo-Abschluss und ein schnellerer Weg zu Planory Pro
• App jetzt auf Deutsch und Englisch
• Mehrere Fotos auf einmal hochladen
• Kleinere Verbesserungen
```

## Gut zu wissen
- Das **Abo (In-App-Kauf)** ist bereits freigegeben und muss NICHT erneut separat „zur Prüfung"
  hinzugefügt werden (war nur beim allerersten Mal nötig).
- **Einziger echter Blocker** für den Upload ist der Info.plist-Kamera-Eintrag (Schritt 2).
  Untertitel + englische Lokalisierung sind Qualität/ASO – am besten gleich mit einreichen.
- Nach der Freigabe: in der Store-/TestFlight-Version einmal „Rechnung scannen → Take Photo"
  testen – der Absturz muss weg sein.
