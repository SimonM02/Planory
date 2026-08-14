# Sprachen & Übersetzungen (i18n)

Alle übersetzbaren Texte stehen an **einer** zentralen Stelle in `index.html`.
So kann man Texte ändern und neue Sprachen ergänzen, ohne etwas zu vergessen.

## Die zentrale Textliste: `TEXTE`
Suche in `index.html` nach `const TEXTE = {`. Aufbau – **ein Text pro Zeile**:

```js
const TEXTE = {
  'Speichern':          { en: 'Save' },
  'Noch keine Ausgaben':{ en: 'No expenses yet' },
  ...
};
```

- **Links** steht immer der **deutsche** Text (das Original, so wie er im Code steht).
- **Rechts** die Übersetzung(en), pro Sprache ein Kürzel: `en` = Englisch.

### Einen Text ändern / ergänzen
Einfach die passende Zeile suchen und den englischen Text anpassen –
oder eine neue Zeile hinzufügen.

## Auswahl-Menüs (Dropdowns): `OPTIONEN`
Direkt darunter steht `const OPTIONEN = { ... }` – gleicher Aufbau, aber für
Auswahllisten (z. B. „Bezahlt", „Offen"). **Wichtig:** Der gespeicherte Wert
bleibt intern immer deutsch, nur die Anzeige wird übersetzt (sonst brechen
bereits gespeicherte Daten).

## Neue Sprache hinzufügen (z. B. Französisch `fr`)
1. In `TEXTE` und `OPTIONEN` bei jedem Text das neue Kürzel ergänzen, z. B.:
   ```js
   'Speichern': { en: 'Save', fr: 'Enregistrer' },
   ```
2. Den Sprach-Umschalter (DE/EN) um die neue Sprache erweitern (sag mir Bescheid,
   das baue ich ein – das ist nur an 1–2 Stellen).

## Was fehlt noch? → eingebautes Prüf-Werkzeug
Damit **nichts vergessen** wird, gibt es eine Funktion, die dir alle Texte
auflistet, die in einer Sprache noch fehlen:

1. App im Browser öffnen (planory.at).
2. Entwickler-Konsole öffnen: **F12** → Reiter **„Console"**.
3. Eintippen und Enter:
   ```js
   i18nMissing('en')      // was fehlt auf Englisch?
   i18nMissing('fr')      // was fehlt auf Französisch?
   ```
   → Es erscheint eine Liste aller noch nicht übersetzten Texte.

## Noch offen (gezielter zweiter Durchgang)
Ein paar lange Texte sind noch Deutsch, weil sie durch Fett-/Link-Teile
zerstückelt sind (v. a. der **Onboarding-/Datenschutz-Bildschirm** und einzelne
Hilfetexte). Die werden am besten als ganze Blöcke übersetzt – das machen wir in
einem eigenen kleinen Schritt.

## Für Entwickler
- `index.html` und `www/index.html` müssen **byte-identisch** bleiben
  (`cmp index.html www/index.html`), Prüfung über `node tests/pruefen.mjs`.
- Die statischen Grundgerüst-Texte (Menü, Seitentitel) nutzen `data-i18n="key"`
  + das Objekt `I18N` (bereits vollständig de/en). Alles Dynamische läuft über
  `TEXTE` (exakter Text-Abgleich beim Rendern via `_sweepPhrases`).
