# Rettung Kunde (sachs.spiess@gmail.com)

Stand: 28.07.2026 · **Bereit zum Ausführen, sobald Supabase-Zugriff da ist.**

## Was kaputt ist (Ursache, im Code belegt)
Die „Lösch-Markierungen" (`_deletedIds`) sind verseucht. Beim Hochladen gilt:
- `syncToCloud` Schritt 2 → **löscht** alle markierten Einträge aus der Cloud
- `syncToCloud` Schritt 3 → `if (deleted[String(item.id)]) continue;` → markierte
  Einträge werden **nie hochgeladen**
- `loadFromCloud` → `if (del[r.item_id]) return;` → markierte Einträge werden **ausgeblendet**

Ursache der Verseuchung: der Merge-Fehler vom 23.07. hat alte Markierungslisten
**vereinigt** und über `projektdaten` in die Cloud geschrieben → alle Geräte haben
sie heruntergeladen.

**Folge:** Hochladen aus der App **löscht** die Daten, statt sie zu retten.
Symptom: „Projekte: 1 · Aufgaben gesamt: 0".

## ⛔ Bis zur Rettung – dem Kunden sagen
- **NICHT** „⬆️ Zur Cloud speichern" (löscht weiter)
- **NICHT** abmelden (`doLogout` lädt vorher automatisch hoch = löscht)
- **NICHT** „🔄 Cloud überschreibt alles" (defekt)
- Web-Tabs geschlossen lassen. App am besten gar nicht anfassen.

## ✅ Rettungsplan (Reihenfolge einhalten!)

### 1) Backup zurückspielen
Supabase → Database → Backups → **„23 Jul 2026 07:55:39"** → Restore.
(Backups ab dem 23.07. nachmittags enthalten den Schaden – nicht nehmen.
Backups vom 24.–28.07. ebenfalls nicht.)

### 2) Prüfen, ob die Einträge zurück sind
```sql
select id from auth.users where email = 'sachs.spiess@gmail.com';
-- ID oben einsetzen:
select item_type, count(*) from projekt_items
where user_id = 'KUNDEN-ID' group by item_type order by 2 desc;
```
➡️ Es müssen Aufgaben/Kosten auftauchen. Wenn ja → weiter.

### 3) Verseuchte Markierungen in der Cloud leeren
```sql
update projektdaten
set daten = jsonb_set(
      daten::jsonb, '{projects}',
      (select jsonb_agg(p - '_deletedIds' || '{"_deletedIds":{}}'::jsonb)
       from jsonb_array_elements(daten::jsonb->'projects') p)
    )::json
where user_id = 'KUNDEN-ID';
```
Danach nochmal Schritt 2 prüfen (Zahlen dürfen sich nicht verringern).

### 4) Geräte säubern – WICHTIG, sonst kommt der Schaden zurück
Die verseuchten Markierungen liegen **auch lokal** auf jedem Gerät. Sie müssen weg,
**ohne** vorher hochzuladen (Abmelden lädt hoch → verboten):

- **iPhone-App:** App **löschen** und aus dem App Store **neu installieren**,
  dann einloggen → lädt sauber aus der Cloud.
  ⚠️ Nur machen, wenn Schritt 2 bestätigt hat, dass die Daten in der Cloud sind!
- **Web:** ein **privates Fenster** (Inkognito) öffnen und dort einloggen –
  hat keinen alten Speicher. Alternativ im Browser die Website-Daten für
  planory.at löschen.

### 5) Kontrolle
App und Web öffnen → beide zeigen denselben Stand vom 23.07.
Danach normal weiterarbeiten.

## Danach: Ursache dauerhaft beheben (Code)
- Lösch-Markierungen dürfen **niemals** verhindern, dass ein lokal vorhandener
  Eintrag hochgeladen wird (aktuell: `continue` in Schritt 3).
- Markierungen brauchen ein Verfallsdatum / müssen nach erfolgreicher Löschung
  entfernt werden, statt ewig zu blockieren.
- Manuelle Knöpfe („Zur Cloud speichern" / „Von Cloud laden" / „Cloud
  überschreibt alles") gehören raus – automatischer Sync mit klarer Regel.
- Alles nur mit Testumgebung + `tests/pruefen.mjs`, nie wieder direkt live.
