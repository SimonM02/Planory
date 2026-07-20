# Cloud-Sync – gefundene Schwachstellen (Datenintegrität)

Stand: Review vom 20.07.2026. **Noch NICHT behoben** – bewusst, weil eine
ungetestete Änderung am Sync selbst Datenverlust verursachen könnte. Fix nur
mit anschließendem Zwei-Geräte-Test (siehe unten).

## Kernproblem
`_mergeProjects` / `_mergeArr` (die „neuere Version gewinnt"-Zusammenführung,
index.html ~10519–10589) sind **totes Code – werden nie aufgerufen**.
`loadFromCloud` ersetzt `projects` komplett durch die Cloud-Version;
`syncToCloud` schreibt `projektdaten` als vollen Snapshot ohne Vergleich.
Ergebnis: effektiv „wer zuletzt speichert, gewinnt".

## Findings

### 1) Gelöschter Eintrag kcommt zurück (HIGH) — syncToCloud ~10783
Gerät A löscht X (Tombstone in `_deletedIds`). Gerät B (hat X noch, kennt den
Tombstone noch nicht) speichert kurz darauf → überschreibt die `projektdaten`
inkl. `_deletedIds` **ohne** Union mit der Cloud → Tombstone weg, X-Zeile wird
wieder angelegt. X ist für alle wieder da.
Fix: vor dem Schreiben Cloud-`_deletedIds` lesen und **vereinen** (max-ts je id);
in Schritt 3 alle Items mit vereinter Tombstone-Menge überspringen.

### 2) Frisch angelegter Eintrag geht verloren (HIGH) — loadFromCloud ~11008
Gerät B legt Y an (noch nicht gesynct, 500ms-Timer läuft). Gerät A ändert
irgendetwas → Realtime feuert bei B → `loadFromCloud` ersetzt `projects` durch
Cloud (ohne Y) → B's pendender Sync schreibt jetzt den Y-losen Stand → Y ist
für immer weg. Auch bei App-Fokus (`_syncAndRender`, visibilitychange).
Fix: vor `loadFromCloud` den pendenden Sync flushen + Realtime kurz halten;
und/oder Cloud in lokal **mergen** statt ersetzen (`_mergeArr` verwenden).

### 3) Älterer Edit überschreibt neueren (HIGH) — syncToCloud ~10847
Upsert nach `projekt_items` hat **keine** Bedingung auf `updated_at` → wer
zuletzt synct, gewinnt, auch wenn sein Edit älter ist. Die Ladeseite vergleicht
`_updatedAt` ebenfalls nicht. Der zugesicherte „neuere gewinnt"-Schutz greift
weder beim Schreiben noch beim Lesen.
Fix: Schreiben/Lesen `_updatedAt`-bewusst machen (per-Row-Guard oder `_mergeArr`).

### 4) Gelöschte Budget-Kategorie taucht wieder auf (MEDIUM) — syncToCloud ~10781
`budgetKat` liegt nur im vollen `projektdaten`-Snapshot, `deleteBudgetKat` nutzt
kein `_trackDeletion`. Stale Gerät schreibt Kategorie zurück. Zusätzlich bumpt
`saveAll` (Zeile ~4168, `_budgetKatTs = _budgetKatTs || Date.now()`) den
Zeitstempel bei normalen Änderungen nicht.
Fix: echte Tombstones für budgetKat (oder id-Merge mit `_deletedIds`); in
syncToCloud Cloud-budgetKat nur bei neuerem lokalen `_budgetKatTs` überschreiben;
Zeile 4168 bei jeder budgetKat-Änderung bumpen.

## Was NICHT betroffen ist (sound)
- Reine ADDs anderer Geräte werden nicht durch einen Snapshot überschrieben
  (projekt_items wird nicht wipe-and-rewrite).
- Merge vergleicht ids konsistent mit `String(id)`.
- Kompletter Leer-Überschreiber des Kontos ist durch die Sicherheitsprüfung in
  syncToCloud (~10757) abgefangen.

## Fix-Plan (mit Test!)
1. Fixes umsetzen (Load-Merge aktivieren, Tombstone-Union, budgetKat-Tombstones).
2. Auf Web deployen.
3. **Sofort Zwei-Fenster-Test** (zwei Browserfenster, gleicher Account):
   - Löschen in Fenster A → in B darf X nach Reload NICHT zurückkommen.
   - Neu anlegen in B, gleichzeitig Edit in A → nichts geht verloren.
   - Gleichen Eintrag in A und B ändern → neuerer Edit gewinnt.
4. Bei Problemen sofort `git revert`.
