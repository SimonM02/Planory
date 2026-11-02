# Instagram-Serie „Planory erklärt“

Jede Folge stellt **eine** Funktion ausführlich vor. Sie dauert ca. 25–28 s, ist 1080×1920 groß und hat
eigene Soundeffekte. Die Musik legst du in Instagram leise darunter (Originalton ca. 100 %, Musik
30–40 %).

**Rhythmus:** 2 Folgen pro Woche, **Dienstag und Freitag um ca. 19:00**. Um diese Zeit sind
Bauherren nach der Arbeit am Handy.

## Plan

| # | Datum | Funktion | Status |
|---|---|---|---|
| 0 | So 08.11.2026 | **Intro: Was ist Planory + die Serie** | ✅ fertig |
| 1 | Di 10.11.2026 | Budget | ✅ fertig |
| 2 | Fr 13.11.2026 | Rechnung scannen (KI) | ✅ fertig |
| 3 | Di 17.11.2026 | Zeitplan & Meilensteine (Erinnerungen) | offen |
| 4 | Fr 20.11.2026 | Aufgaben (Heute/Kommende, Unteraufgaben, wiederkehrend) | offen |
| 5 | Di 24.11.2026 | Bautagebuch (Fotos, Wetter, Erinnerungs-Buch als PDF) | offen |
| 6 | Fr 27.11.2026 | Angebote vergleichen | offen |
| 7 | Di 01.12.2026 | Zahlungsplan & Kostenaufteilung | offen |
| 8 | Fr 04.12.2026 | Pläne & Dokumente | offen |
| 9 | Di 08.12.2026 | Mängel erfassen | offen |
| 10 | Fr 11.12.2026 | Kontakte & Helfer (Eigenleistung) | offen |
| 11 | Di 15.12.2026 | KI-Berater | offen |
| 12 | Fr 18.12.2026 | iPhone & Web – überall dasselbe Projekt | offen |
| Bonus | Jänner 2027 | Wartung nach dem Einzug | offen |

- **Regel:** Vor jeder Folge prüfe ich in der App, dass die Funktion genau so existiert. Nichts
  zeigen, was es (noch) nicht gibt, z. B. „Projekt teilen“.
- **Bilder:** echte App-Bildschirme aus dem Demo-Modus (Musterhaus Graz), keine Kundendaten.
- **Intro:** nennt bewusst keine Termine (kein „Di & Fr“, kein „bald“).

## Titelbild (Cover)
Jede Folge beginnt mit einem einheitlichen Titelbild: „PLANORY ERKLÄRT“, große Nummer, Titel und
Symbol. Beim Hochladen in Instagram unter **Titelbild bearbeiten → Aus Kamerarolle** die Datei
`folgeNN-…-titelbild.jpg` wählen. Alles Wichtige liegt in der Mitte, damit es auch im Profil-Raster
(Ausschnitt 3:4) vollständig zu sehen ist. So sieht das Profil wie eine geordnete Reihe aus.

## Beschreibungstexte

**Folge 0 – Intro**
```
Du baust ein Haus? 🏡
Planory ist dein digitaler Bauassistent – Budget, Rechnungen, Zeitplan, Aufgaben, Bautagebuch und mehr in einer App.
In unserer Serie „Planory erklärt“ zeigen wir dir alle Funktionen – Folge für Folge.
Los geht’s mit Folge 1: Budget 💶
👉 Folge uns, damit du keine Folge verpasst · planory.at (iPhone & Web)
#hausbau #häuslbauer #eigenheim #hausbauen #bauherren #neubau #bauplanung #hausbau2026 #österreich
```

**Folge 1 – Budget**
```
Wie viel Budget ist noch übrig? 💶
Planory erklärt · Folge 1: Budget
① Alles auf einen Blick – Gesamtbudget, ausgegeben, verbleibend
② Geplant vs. ausgegeben – für jede Kategorie
③ Kostenentwicklung Monat für Monat
④ Eigenleistung? Ein Haken – zählt nicht zum Budget
⑤ Beträge verbergen, wenn jemand mitschaut
👉 planory.at (iPhone & Web)
Nächste Folge: Rechnung scannen 📸
#hausbau #häuslbauer #baubudget #eigenheim #hausbauen #bauherren #neubau #hausbau2026 #österreich
```

**Folge 2 – Rechnung scannen**
```
Rechnungen abtippen? Nie wieder. 📸
Planory erklärt · Folge 2: Rechnung scannen
① „Rechnung scannen“ direkt auf der Startseite
② Foto machen
③ Die KI füllt Beschreibung, Anbieter, Datum, Betrag & Kategorie aus
④ „Bezahlt von“ – praktisch, wenn ihr zu zweit baut
⑤ Alles in der Ausgabenliste – nach Kategorie filtern, mit Summe
👉 planory.at (iPhone & Web)
Nächste Folge: Zeitplan & Meilensteine 📅
#hausbau #häuslbauer #rechnungen #eigenheim #hausbauen #bauherren #neubau #bautagebuch #österreich
```

## Technik (für neue Folgen)
- **Bildschirme:** `node marketing/serie/screens.mjs` → `screens/*.png` + `screens/boxes.json`
  (Positionen der Felder).
- **Inhalt:** neue Folge als Datenobjekt in `folgen.js` (Texte, Bildschirme, Lupen, Antippen …).
- **Rendern:** wie Reel 1 mit
  `REEL_PAGE="serie/serie.html?ep=N" REEL_DUR=<s> node marketing/reel/render.cjs full …`,
  Ton mit `node marketing/serie/sound.cjs N`.
