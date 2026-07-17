# Native Push (APNs) – Einrichtung

Ziel: Die **App-Store-App** bekommt Erinnerungen auch bei **geschlossener App**,
und bei geteiltem Konto auf **allen** iPhones. Der Code ist fertig – es fehlen
nur noch die Schlüssel/Konfiguration (die kann nur der Kontoinhaber anlegen).

Reihenfolge: **1 Supabase → 2 Apple → 3 Vercel → 4 Build 7 → 5 Testen.**

---

## 1) Supabase: Tabelle anlegen (SQL Editor)

```sql
create table if not exists native_push_tokens (
  token       text primary key,
  user_id     uuid not null,
  platform    text default 'ios',
  updated_at  timestamptz default now()
);
create index if not exists native_push_tokens_user on native_push_tokens (user_id);
```

(Die API greift mit dem Service-Role-Key zu, RLS ist daher nicht nötig.)

---

## 2) Apple Developer: APNs-Schlüssel erstellen

1. https://developer.apple.com → **Certificates, Identifiers & Profiles** → **Keys**
2. **+** (neuen Key) → Name z. B. „Planory Push" → **Apple Push Notifications service (APNs)** anhaken → **Continue** → **Register**
3. **Download** der `.p8`-Datei — ⚠️ **nur EINMAL herunterladbar**, gut aufheben.
4. Notiere die **Key ID** (10 Zeichen, steht beim Key).
5. Notiere deine **Team ID** (10 Zeichen, oben rechts im Developer-Account unter „Membership").

---

## 3) Vercel: Environment Variables (Projekt bauplan-weld)

Neu anlegen (Production + Preview):

| Key | Wert |
|---|---|
| `APNS_KEY` | **kompletter Inhalt der .p8-Datei**, inkl. `-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----` (mehrzeilig einfügen ist ok) |
| `APNS_KEY_ID` | die Key-ID aus Schritt 2.4 |
| `APNS_TEAM_ID` | deine Team-ID aus Schritt 2.5 |
| `APNS_BUNDLE_ID` | `com.planory.bau` |
| `APNS_PRODUCTION` | **leer lassen / „true"** für App-Store & TestFlight. Nur `false`, wenn du einen Build direkt aus Xcode aufs Handy spielst (Debug/Sandbox). |

Danach **Redeploy** (Deployments → oberstes → ⋯ → Redeploy).

> ⚠️ Häufigster Stolperstein: **Sandbox vs. Produktion.** App-Store/TestFlight-Apps
> brauchen `APNS_PRODUCTION`=true (oder leer). Ein direkt aus Xcode installierter
> Debug-Build braucht `false`. Passt das nicht zusammen → `BadDeviceToken`.

---

## 4) Build 7 am Mac

```
cd planory
git pull
npm install            # installiert @capacitor/push-notifications
npx cap sync ios
npx cap open ios
```

In **Xcode** zusätzlich (einmalig):
1. App-Target → **Signing & Capabilities** → **+ Capability** → **Push Notifications** hinzufügen.
2. (Optional für Hintergrund-Handling) **+ Capability** → **Background Modes** → **Remote notifications** anhaken.
3. Version **1.3**, Build **7** → **Archive** → hochladen → einreichen.

---

## 5) Testen (nach Freigabe / via TestFlight)

1. App öffnen → **Einstellungen → Mitteilungen → „Erlauben"**. Die App registriert
   dann automatisch ihren APNs-Token (landet in `native_push_tokens`).
2. In der App **„🌐 Server-Push testen"** → es sollte eine echte Push kommen.
3. Gegenprobe: auf **einem** Gerät eine Erinnerung anlegen → zur fälligen Zeit
   bekommen **alle** eingeloggten Geräte (Web + native Apps) die Benachrichtigung.

Diagnose: Der Test-Button zeigt im grauen Kasten `native_tokens`, `apns_keys`,
`native_sent` und ggf. `apns_error` – daran sieht man sofort, wo es hakt.

---

## Was der Code schon macht (fertig)
- Client registriert beim Erlauben der Mitteilungen den APNs-Token
  (`_registerNativePush` → `POST /api/native-token-register`).
- `push-cron.js` (15-Min-Zeitplan) sendet fällige Erinnerungen an **web UND native**
  Geräte jedes Nutzers; ungültige Tokens werden automatisch entfernt.
- `push-test.js` (Test-Button) sendet an web + native.
- `_apns.js` erzeugt das ES256-JWT und spricht Apples HTTP/2-API.

Ohne die Schlüssel (Schritt 2–3) passiert native-seitig einfach nichts – der
Web-Push läuft davon unberührt weiter.
