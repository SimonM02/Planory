# Supabase Storage – Bucket für Fotos & Anhänge

Der Code lädt Fotos/Anhänge jetzt in **Supabase Storage** hoch (statt als
Base64 in den lokalen Speicher). **Solange der Bucket nicht existiert, passiert
nichts Schlimmes** – der Upload fällt automatisch auf das bisherige Verhalten
(komprimiertes Base64) zurück. Sobald der Bucket da ist, wandern neue Uploads
automatisch in die Cloud und der lokale Speicher läuft nicht mehr voll.

## Einrichtung (einmalig, ~2 Minuten)

### 1) Bucket anlegen
Supabase-Dashboard → **Storage** → **New bucket**
- **Name:** `uploads`
- **Public bucket:** **AN** (wichtig – damit Fotos per URL angezeigt werden)
- **Create**

### 2) Upload-Rechte (Policy)
Öffentliche Buckets sind schon **lesbar**. Für das **Hochladen** durch
eingeloggte Nutzer noch diese Policies setzen – am einfachsten im **SQL Editor**:

```sql
-- Eingeloggte Nutzer dürfen in 'uploads' hochladen
create policy "uploads_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads');

-- Eingeloggte Nutzer dürfen in 'uploads' löschen
create policy "uploads_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads');

-- (Öffentliches Lesen macht der Public-Bucket bereits; zur Sicherheit)
create policy "uploads_read" on storage.objects
  for select to public
  using (bucket_id = 'uploads');
```

### 3) Testen (Web, planory.at)
- Ein Foto in der Galerie hochladen → sollte normal erscheinen.
- Prüfen in Supabase → Storage → `uploads`: dort sollte eine Datei unter
  `<user-id>/fotos/…` liegen. Wenn ja → Storage läuft. ✅
- Bei einem Angebot ein großes PDF anhängen → keine „lokaler Speicher voll"-
  Meldung mehr.

## Was schon umgestellt ist
- **Fotos** (Galerie, Dokumentation, Mängel) → zentrale Ablage
  `uploadFileToStorage` (Storage + Base64-Fallback).
- **Angebot-Anhänge** → laufen jetzt über Storage; die „Anhang öffnen"-Ansicht
  zeigt alte (Base64) UND neue (URL) Einträge, Löschen räumt Storage auf.
- **Rechnungs-Scan** → speichert die Scan-URL im Storage (kein Base64 mehr).
- **Grundriss-Pläne** (auch aus PDF gerendert) → jetzt Storage statt Base64.
- **Grundriss-Pin-Fotos** → Storage (war schon `uploadPhotoToStorage`).
- **Dokumente** → eigener `dokumente`-Bucket (unverändert, bereits Storage).

**Geprüft:** Alle Datei-Upload-Stellen (Galerie, Alben, Dokumentation, Mängel,
Grundrisse + Pins, Angebot-Anhänge, Rechnungs-Scan, Dokumente) laufen jetzt über
die Cloud-Ablage – nur Vorschauen im Formular nutzen kurzzeitig Base64 (wird
nicht gespeichert).

**Bekannte Kleinigkeit (unkritisch):** Grundriss-**Pin-Fotos** speichern nur die
URL (nicht den Storage-Pfad). Beim Löschen eines Pins/Stockwerks bleiben deren
Fotos daher als „Waise" im Bucket liegen (nur Speicherplatz, kein Fehler, kein
Datenverlust). Aufräumen = kleiner Folge-Schritt (Pin-Fotos als {url,path}
speichern + Render/Lightbox anpassen).

→ Alle großen Datei-Stellen liegen jetzt in der Cloud-Ablage (sobald der
  `uploads`-Bucket existiert). Ohne Bucket: sicherer Base64-Fallback wie bisher.
