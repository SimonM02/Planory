# ⭐ NÄCHSTER APP-BUILD (Version 1.2) – Checkliste

**Wann:** erst wenn Version 1.1 (Build 2) bei Apple durch ist.
**Alles hier ist schon im Code fertig + live im Web – es fehlt nur der neue App-Build.**

## Was in v1.2 neu ist
1. Willkommens-Dialog nach dem Onboarding (Begrüßung + Gratismonat/Abo-Erklärung)
2. Nach dem Onboarding landet man zuverlässig auf dem Dashboard
3. Entwickler-Block „Diagnose & Test" aus den Einstellungen entfernt
4. **Mehrfach-Foto-Upload** in der App (nativer Picker) ← braucht die Extra-Schritte unten

## Schritte – in genau dieser Reihenfolge

```bash
# 1. NEU: Foto-Plugin installieren (nur dieses eine Mal nötig)
npm install @capacitor/camera

# 2. Alle v1.2-Änderungen holen
git pull origin claude/apple-feedback-changes-owr1go

# 3. Ins iOS-Projekt übernehmen
npx cap sync ios
```

```
# 4. In XCODE:
#    a) Info.plist → neuen Eintrag hinzufügen:
#       Schlüssel: NSPhotoLibraryUsageDescription
#       Text:      Planory braucht Zugriff auf deine Fotos, um
#                  Baufortschritt-Bilder hinzuzufügen.
#    b) Version auf 1.2 setzen, Build-Nummer erhöhen (z.B. 3)
#    c) Ziel oben auf "Any iOS Device (arm64)"
#    d) Product → Archive → Distribute App → App Store Connect → Upload
```

```
# 5. In App Store Connect:
#    - neue Version 1.2 anlegen, Build zuweisen
#    - Export-Compliance-Frage: NEIN
#    - "Neue Funktionen" (What's New) ausfüllen (Vorschlag unten)
#    - Zur Prüfung übermitteln
```

## Vorschlag „Neue Funktionen" (What's New) für v1.2
```
• Freundliche Begrüßung nach dem Einrichten – mit Erklärung zum Gratismonat
• Nach dem Onboarding geht's direkt zur Übersicht
• Mehrere Fotos auf einmal hochladen
• Kleinere Verbesserungen
```

## Wichtig
- Das Abo ist ab v1.2 **kein** neues Element mehr – es muss NICHT wieder separat
  „zur Prüfung" hinzugefügt werden (das war nur beim allerersten Mal nötig).
- Der Mehrfach-Foto-Picker greift nur, wenn Schritt 1 (`@capacitor/camera`) gemacht
  wurde. Ohne das Plugin bleibt der Foto-Upload wie bisher (nichts geht kaputt).
