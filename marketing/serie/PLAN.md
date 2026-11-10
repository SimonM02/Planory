# Instagram-Serie „Planory erklärt“

Jedes Video stellt **eine** Funktion ausführlich vor und heißt nach dieser Funktion – **bewusst ohne
Folgen-Nummern**. Ca. 25–30 s, 1080×1920, dezente Soundeffekte; Musik wird eingebaut (Auswahl offen)
oder in Instagram dazugelegt.

**Helle Fassung (11.11.2026, Simons Wunsch – der zweifarbige Schriftzug wirkte „nach KI“):** `serie.html?…&hell=1`
schaltet auf Papierton, Tinte und Schrift Archivo um (wie die Website); Schriftzug „Planory“ einfarbig, keine
Leucht-Effekte/Staub. Die Schrift liegt in `/site/fonts`, darum mit Server im Projekt-Ordner rendern:
`REEL_PORT=8767 REEL_PAGE="marketing/serie/serie.html?ep=0&hell=1" …`. Gilt für alle Videos der Serie.

**Intro, Stand 10.11.2026:** 23,1 s – Titelbild 2,4 s (länger, `coverDur` in `folgen.js`), Einstiegsfrage 1,8 s (kürzer).
Dateien: `planory-erklaert-intro_close-up.mp4` (Musik „Close Up“, Michael Ramir C., Mixkit ID 1167 – flotter als das
Klavier davor) und `…_ohne-musik.mp4`. Alternativen gemischt (nur Scratchpad): „Pop Track 03“ (Lily J, ID 729),
„PlaceIt World 01“ (Lily J, ID 724). Frühere Wahl: „Piano Reflections“ (ID 22, Simon: zu ruhig), „Lo-Fi 04“ (ID 766).
Alle „Mixkit Stock Music Free License“ (Social Media + Werbung erlaubt), Lizenz im Seitenquelltext von mixkit.co
geprüft (09./10.11.2026). Musikdateien liegen in `musik/` (nicht im Repo).
Mischung: Musik −17 LUFS, Effekte −26 LUFS, +2,5 dB, Limiter 0,72, 2 s Ausblenden → gesamt ca. −15 LUFS.

## Plan

| Reihenfolge | Datum | Funktion | Status |
|---|---|---|---|
| Start | sofort (Event) | **Intro: Überblick – „Eine App. Mehr brauchst du nicht.“** | ✅ fertig |
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

- **Regel:** Vor jedem Video prüfe ich in der App, dass die Funktion genau so existiert. Nichts
  zeigen, was es (noch) nicht gibt, z. B. „Projekt teilen“.
- **Bilder:** echte App-Bildschirme aus dem Demo-Modus (Musterhaus Graz), keine Kundendaten.
- **Intro:** nennt bewusst keine Termine (kein „Di & Fr“, kein „bald“).

## Titelbild (Cover)
Jedes Video beginnt mit einem einheitlichen Titelbild: „PLANORY ERKLÄRT“, großer Funktionsname und
Symbol (ohne Nummer). Beim Hochladen in Instagram unter **Titelbild bearbeiten → Aus Kamerarolle**
die Datei `planory-erklaert-…-titelbild.jpg` wählen. Alles Wichtige liegt in der Mitte, damit es auch im Profil-Raster
(Ausschnitt 3:4) vollständig zu sehen ist. So sieht das Profil wie eine geordnete Reihe aus.

## Beschreibungstexte

**Intro – Überblick**
```
Du planst ein Haus – oder baust schon? 🏡
Planory ist die eine App für dein ganzes Bauprojekt: Budget, Rechnungen, Zeitplan, Bautagebuch und mehr – immer aktuell am iPhone und im Web.
Eine App. Mehr brauchst du nicht.
In „Planory erklärt“ zeigen wir dir jede Funktion – kurz, klar, Schritt für Schritt.
Als Nächstes: Budget 💶
👉 Folge uns, damit du nichts verpasst · planory.at
#hausbau #häuslbauer #eigenheim #hausbauen #bauherren #neubau #bauplanung #hausbau2026 #österreich
```
- Bewusst „die eine App“ statt „die einzige App“: „einzige“ wäre eine Alleinstellungs-Behauptung (Werberecht).

**Budget**
```
Wie viel Budget ist noch übrig? 💶
Planory erklärt: Budget
① Alles auf einen Blick – Gesamtbudget, ausgegeben, verbleibend
② Geplant vs. ausgegeben – für jede Kategorie
③ Kostenentwicklung Monat für Monat
④ Eigenleistung? Ein Haken – zählt nicht zum Budget
⑤ Beträge verbergen, wenn jemand mitschaut
👉 planory.at (iPhone & Web)
Als Nächstes: Rechnung scannen 📸
#hausbau #häuslbauer #baubudget #eigenheim #hausbauen #bauherren #neubau #hausbau2026 #österreich
```

**Rechnung scannen**
```
Rechnungen abtippen? Nie wieder. 📸
Planory erklärt: Rechnung scannen
① „Rechnung scannen“ direkt auf der Startseite
② Foto machen
③ Die KI füllt Beschreibung, Anbieter, Datum, Betrag & Kategorie aus
④ „Bezahlt von“ – praktisch, wenn ihr zu zweit baut
⑤ Alles in der Ausgabenliste – nach Kategorie filtern, mit Summe
👉 planory.at (iPhone & Web)
Als Nächstes: Zeitplan 📅
#hausbau #häuslbauer #rechnungen #eigenheim #hausbauen #bauherren #neubau #bautagebuch #österreich
```

## Technik (für neue Videos)
- **Bildschirme:** `node marketing/serie/screens.mjs` → `screens/*.png` + `screens/boxes.json`
  (Positionen der Felder).
- **Inhalt:** neues Video als Datenobjekt in `folgen.js` (Texte, Bildschirme, Lupen, Antippen …).
- **Rendern:** wie Reel 1 mit
  `REEL_PAGE="serie/serie.html?ep=N" REEL_DUR=<s> node marketing/reel/render.cjs full …`,
  Ton mit `node marketing/serie/sound.cjs N`.
