# iPhone-Widgets einrichten (einmalig am Mac)

Planory bekommt zwei Widgets für den Home-Bildschirm:

- **Planory – Schnellzugriff** (klein/mittel): deine ersten 4 Schnellzugriffe vom Dashboard (z. B. Rechnung scannen,
  Bautagebuch-Eintrag) – ein Tipp öffnet die App direkt an dieser Stelle.
- **Planory – Termine & Aufgaben** (klein/mittel/groß): was heute und in den nächsten Tagen ansteht
  (Aufgaben, Zeitplan, Zahlungen, Skonto-Fristen, Wartung, Helfer-Tage). Überfälliges rot. Keine Beträge.

Die App schreibt die Daten selbst (nach jedem Speichern und beim Öffnen). Der Widget-Code liegt fertig in
`ios-widget/PlanoryWidgets.swift`. In Xcode musst du nur einmal die „Widget-Erweiterung“ anlegen – das geht nicht
automatisch. Dauer: ca. 15 Minuten.

---

## 1. Projekt aktualisieren (Terminal, im Planory-Ordner)

```
git pull
npm install
npx cap sync ios
npx cap open ios
```

In der Ausgabe von `npx cap sync ios` muss **capacitor-widget-bridge** stehen.

## 2. Widget-Erweiterung anlegen (Xcode)

1. Menü **File → New → Target…**
2. Oben **iOS** wählen, dann **Widget Extension** → **Next**.
3. **Product Name:** `PlanoryWidget`
   - Haken bei **Include Live Activity** und **Include Configuration App Intent** **entfernen**.
   - **Finish**. Fragt Xcode „Activate scheme?“ → **Activate**.
4. Links im Projekt erscheint ein neuer Ordner **PlanoryWidget**. Darin alle `.swift`-Dateien löschen
   (Rechtsklick → Delete → **Move to Trash**). Die Dateien `Assets.xcassets` und `Info.plist` bleiben.
5. Die Datei `ios-widget/PlanoryWidgets.swift` aus dem Planory-Ordner (Finder) in den Xcode-Ordner
   **PlanoryWidget** ziehen. Im Fenster: **Copy items if needed** an, bei „Add to targets“ **nur PlanoryWidget**
   anhaken → **Finish**.

## 3. Gemeinsamer Speicher „App Group“ (beide Ziele!)

1. Links ganz oben auf das blaue Projekt **App** klicken.
2. Unter **TARGETS** zuerst **App** wählen → Reiter **Signing & Capabilities** → **+ Capability** → **App Groups**.
   - Mit **+** die Gruppe `group.com.planory.bauassistent` anlegen und anhaken.
3. Dasselbe für das Ziel **PlanoryWidget**: **+ Capability → App Groups** → dieselbe Gruppe anhaken.
4. Bei **PlanoryWidget** unter **Signing** dasselbe **Team** wie bei der App wählen.
5. Bei **PlanoryWidget** → Reiter **General** → **Minimum Deployments**: **iOS 16.0** (oder höher).

## 4. Link-Adresse `planory://` (nur Ziel App)

1. **TARGETS → App** → Reiter **Info** → ganz unten **URL Types** → **+**.
2. **Identifier:** `com.planory.bauassistent` · **URL Schemes:** `planory` · Rest leer lassen.

## 5. Testen am iPhone

1. Oben das Ziel **App** und dein iPhone wählen → ▶ (Run). Planory öffnet sich – einmal anmelden und kurz warten.
2. Home-Bildschirm: lange drücken → **+** (links oben) → „Planory“ suchen → beide Widgets hinzufügen.
3. Prüfen:
   - Schnellzugriff zeigt deine Aktionen; Tippen auf „Rechnung scannen“ öffnet in Planory das Scan-Fenster.
   - Termine & Aufgaben zeigt deine nächsten Einträge; eine neue Aufgabe für heute anlegen → Widget aktualisiert
     sich nach ein paar Sekunden.
4. Fehlermeldungen von Xcode (rot) bitte als Screenshot an Claude – dann wird der Code angepasst.

## 6. Hochladen (zusammen mit v1.4)

Wie in `NAECHSTER-BUILD-v1.3.md`: Version erhöhen (1.4), **Product → Archive** → hochladen. Die Widget-Erweiterung
wird automatisch mit eingepackt. Im App-Store-Text unter „Neu“ erwähnen: „Widgets für den Home-Bildschirm“.

---

**Gut zu wissen**
- Abgemeldet oder im Demo-Modus zeigen die Widgets „Öffne Planory einmal …“ (keine fremden Daten).
- Die Widgets zeigen bewusst **keine Beträge** – den Home-Bildschirm sieht jeder.
- Ohne Abo gelten in der App dieselben Sperren wie sonst (das Widget öffnet nur die Stelle).
- Technik: App → `_widgetDaten()` / `_widgetAktualisieren()` in `index.html` → App Group
  `group.com.planory.bauassistent`, Schlüssel `planoryWidget` → `ios-widget/PlanoryWidgets.swift`.
