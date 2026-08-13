# App-Abo (In-App-Kauf) – Einrichtung Schritt für Schritt

Ziel: In der iPhone-/iPad-App ein Abo per Apple-Bezahlsystem verkaufen.
Web bleibt auf Stripe. Weg: **RevenueCat** (nimmt uns die ganze Apple-Technik ab,
kostenlos bis ~2.500 $ Umsatz/Monat).

## ✅ Der Code ist bereits eingebaut (fail-safe)
Die komplette Abo-Logik steckt schon in `index.html` (RevenueCat: Kauf,
„Käufe wiederherstellen", Entitlement-Prüfung, Paywall mit Apple-Kauf).
**Solange der Schlüssel leer ist, bleibt die App zu 100 % gratis** – nichts
ändert sich, bis du die Zugänge einträgst.

### Was du am Ende nur noch eintragen musst (in `index.html`, ganz oben bei der
### Abo-Logik – oder schick mir die Werte, ich trage sie ein):
```
const RC_API_KEY     = 'appl_XXXXXXXXXXXX';  // dein RevenueCat Public SDK Key (Apple)
const RC_ENTITLEMENT = 'plus';               // Name deiner Berechtigung (falls anders)
```

### Und am Mac (einmalig, für die native App):
```
cd planory && git pull origin main
npm install @revenuecat/purchases-capacitor
npx cap sync ios
```
Dann **über TestFlight mit Sandbox-Test-Nutzern** einen Test-Kauf machen (kostenlos!).
Erst wenn der Kauf sauber funktioniert → Build hochladen & einreichen.

> ⚠️ Wichtig: Diesen Bezahl-Teil kann ich **nicht selbst testen** (keine Geräte/
> Apple-Zugänge hier). Deshalb **unbedingt vorher in TestFlight/Sandbox testen** –
> ggf. justiere ich dann noch 1–2 Kleinigkeiten.

---

## Voraussetzungen, die DU noch erledigen musst (dafür sind die Schritte unten):

## 1) „Paid Apps"-Vertrag aktivieren (Voraussetzung für JEDEN Verkauf)
App Store Connect → **Geschäft / Verträge (Agreements)** →
- **Paid Applications** aktivieren
- **Bankverbindung** (IBAN) hinterlegen
- **Steuer**: US-Formular **W-8BEN** ausfüllen (du bist keine US-Person; deine
  österreichische Steuernummer eintragen → keine/kaum US-Steuer)
- Kann bei Apple **ein paar Tage** dauern → am besten zuerst starten.

## 2) Abo-Produkt anlegen
App Store Connect → deine App **Planory** → **Monetarisierung → Abonnements**:
- **Abo-Gruppe** anlegen (z. B. „Planory Plus")
- **Auto-erneuerbares Abo** hinzufügen, z. B.:
  - Produkt-ID: `planory_plus_monthly` – Preis z. B. 4,99 €/Monat
  - (optional Jahres-Abo: `planory_plus_yearly`)
- Anzeigename, Beschreibung, Screenshot fürs Review ausfüllen.
- **App-spezifisches, gemeinsames Geheimnis** erzeugen (App-Informationen →
  „App-Specific Shared Secret") – das brauchen wir für RevenueCat.

## 3) RevenueCat-Konto einrichten (kostenlos)
Auf **revenuecat.com** registrieren →
- **Projekt** anlegen → **App hinzufügen** (Apple App Store, Bundle-ID
  `com.planory.bau`)
- Das **„App-Specific Shared Secret"** aus Schritt 2 dort eintragen
- **Products** anlegen, die exakt den Produkt-IDs aus Schritt 2 entsprechen
- Ein **Entitlement** (Berechtigung) anlegen, z. B. `plus`, und die Produkte
  damit verknüpfen
- Ein **Offering** mit einem Package anlegen (das zeigt die App als Kaufoption)
- Den **öffentlichen SDK-Schlüssel (Apple)** kopieren – fängt mit `appl_…` an

## 4) Was du mir dann schickst
- Der **RevenueCat Public SDK Key** (`appl_…`)
- Die **Produkt-IDs** (z. B. `planory_plus_monthly`)
- Der **Entitlement-Name** (z. B. `plus`)

→ Damit baue ich die Integration ein: Kauf-Ablauf, „Käufe wiederherstellen",
und die App prüft dann echt „Abo ja/nein" (statt wie jetzt alles gratis).

## 5) Am Mac (wenn wir den Code einbauen)
```
cd planory && git pull
npm install @revenuecat/purchases-capacitor
npx cap sync ios
```
Dann testen wir mit **Sandbox-Testnutzern** (Test-Käufe kosten nichts) über
TestFlight – und wenn alles läuft, **Build 8** hochladen und einreichen.

---

## Kurz-Reihenfolge
1. Paid-Apps-Vertrag (dauert am längsten → zuerst!)
2. Abo-Produkt in App Store Connect
3. RevenueCat einrichten
4. Keys/IDs an mich → ich baue den Code
5. Sandbox-Test → Build 8

**Wichtig:** Nichts hier stört Build 7. Wir schalten das App-Abo erst mit
Build 8 live – nachdem Build 7 durch ist.
