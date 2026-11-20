# Higgsfield-Auftrag für den Claude-Chat (gratis mit Unlimited)

**So geht's:** In der Claude-App einen **neuen normalen Chat** öffnen (nicht Claude Code). Dort muss Higgsfield
verbunden sein. Dann den ganzen Block unten (alles zwischen den Linien) kopieren, einfügen und abschicken.
Der Chat erstellt alles mit deinem Higgsfield-Unlimited. Die fertigen Bilder und Videos liegen danach in deinem
Higgsfield-Konto. Von dort kann ich sie holen und daraus fertige Reels und Posts machen.

Wenn der Chat zwischendurch stoppt, einfach „weiter“ schreiben.

---

```
Bitte erstelle mit Higgsfield die folgenden Bilder und Videos. WICHTIG: Nutze für jede Erstellung mein Unlimited (use_unlim: true), niemals Credits. Falls Unlimited für ein Modell nicht geht, überspringe es und sag es mir am Ende – kaufe nichts, verbrauche keine Credits.

Lege zuerst ein Projekt "Planory Social" an und speichere alles dort.
Erstelle die Bilder als Batch (gpt_image_2_6, quality high, resolution 2k) und die Videos als Batch (seedance_2_5, mode t2v, 720p, generate_audio false). Warte, bis alles fertig ist, und zeig mir am Ende eine Übersicht.

Stil für ALLES: echt wirkende Fotos/Videos wie mit dem Handy auf einer echten Baustelle in Österreich (Einfamilienhaus, Ziegelbau, Holz, ländlich, Hügel/Berge im Hintergrund). Natürliche Farben, nicht kitschig, keine Werbe-Hochglanzoptik. KEIN Text, KEINE Logos, KEINE Markennamen im Bild. Personen: normale Bauherr:innen (Paare, Frauen und Männer, 28–45 Jahre), Alltagskleidung, keine Models-Posen.

BILDER (Seitenverhältnis in Klammern):
B1 (4:5) Rohbau eines Einfamilienhauses am frühen Morgen, Ziegelmauern, frisch betonierte Decke, gelber Baukran im Hintergrund, leichter Nebel, Pfützen auf dem Schotter, keine Personen.
B2 (4:5) Junges Paar steht vor seinem Rohbau und schaut lächelnd auf ein Smartphone, die Frau hält es, Abendlicht, von hinten-seitlich fotografiert (Gesichter nur teilweise sichtbar).
B3 (4:5) Nahaufnahme: Hand hält ein Smartphone über einer Papier-Rechnung auf einer Werkbank aus Holz auf der Baustelle, als würde die Rechnung abfotografiert; Bildschirm unscharf/abgewandt, keine lesbare Schrift.
B4 (4:5) Bauherrin mit Bauhelm und Warnweste macht mit dem Handy ein Foto vom Baufortschritt (Dachstuhl aus Holz wird aufgestellt), blauer Himmel.
B5 (4:5) Chaotischer Küchentisch zu Hause: Stapel Rechnungen, Angebote, Ordner, Taschenrechner, Kaffeetasse, Baupläne – Gefühl "zu viel Papierkram", warmes Lampenlicht, keine Personen.
B6 (4:5) Gleicher Küchentisch, aber aufgeräumt: nur ein Smartphone und eine Kaffeetasse, ruhige Morgenstimmung – Gefühl "alles im Griff".
B7 (4:5) Fertiges modernes Einfamilienhaus mit Holzfassade und großen Fenstern, frisch angelegter Garten, Abendsonne, Paar mit kleinem Kind geht auf die Haustür zu (von hinten).
B8 (4:5) Dachstuhl aus hellem Holz vor blauem Himmel, Zimmerer arbeiten (klein im Bild), Drohnen-ähnliche Perspektive leicht von oben.
B9 (4:5) Innenausbau: Rohe Wände mit Elektro-Leerrohren, Estrich, Leiter, Werkzeug, Sonnenlicht fällt durch Fensteröffnung, keine Personen.
B10 (4:5) Paar sitzt abends auf Umzugskartons im leeren, fast fertigen Wohnzimmer und stößt mit zwei Bier-/Limo-Flaschen an, glücklich, warmes Licht.
B11 (9:16) Baustelle von oben (Drohne), Bodenplatte/Fundament mit Bewehrung, Bagger am Rand, Morgensonne – als Hintergrund für eine Story mit viel freiem Platz oben.
B12 (9:16) Hand hält Smartphone vor einem Rohbau, Bildschirm zeigt eine leere helle Fläche (später setzen wir dort einen App-Screenshot ein), Hintergrund leicht unscharf.

VIDEOS (alle 9:16, Dauer in Klammern):
V1 (6 s) Langsamer Handy-Schwenk über einen Rohbau bei Sonnenaufgang, Kran dreht sich langsam im Hintergrund, Nebel, keine Personen.
V2 (5 s) Nahaufnahme: Hand fotografiert mit dem Smartphone eine Papier-Rechnung auf einer Werkbank, leichte Handbewegung, natürliches Licht.
V3 (6 s) Bauherr:innen-Paar geht über die Baustelle auf den Rohbau zu, Kamera folgt von hinten, Abendlicht.
V4 (5 s) Zeitraffer-Gefühl: Ziegelmauer wächst, Maurer setzt Ziegel, Hände im Fokus.
V5 (6 s) Drohnenflug langsam aufsteigend über ein Einfamilienhaus im Rohbau in einer ländlichen österreichischen Landschaft mit Hügeln.
V6 (5 s) Unordentlicher Küchentisch voller Rechnungen und Ordner, Kamera fährt langsam heran, eine Hand schiebt die Zettel weg und legt ein Smartphone hin.
V7 (6 s) Holz-Dachstuhl wird mit dem Kran eingehoben, Zimmerer winken, blauer Himmel.
V8 (6 s) Fertiges Haus am Abend, Licht geht in den Fenstern an, Paar mit Kind geht zur Haustür (von hinten), ruhige Kamerafahrt.

Am Ende: Liste alle Ergebnisse mit Nummer (B1…B12, V1…V8) und Link.
```

---

## Danach (für Claude Code)
Ergebnisse über `show_generations` im Higgsfield-Konto finden (Projekt „Planory Social“). Für den Download muss
der Host `d8j0ntlcm91z4.cloudfront.net` freigegeben sein. Daraus entstehen:
- Reels: Bild/Video plus Text-Einblendungen, App-Screenshot, Ende „Jetzt starten – planory.at“, Musik
  (`marketing/serie/musik`). Lautheit wie bei der Serie.
- Feed-Posts 4:5 mit Planory-Rahmen und den Texten aus `POST-TEXTE.md`.
- Kennzeichnung „KI-generiert“ klein im Bild, wo Personen zu sehen sind.
